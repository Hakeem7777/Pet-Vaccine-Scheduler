import logging
import json

from dateutil import parser as date_parser
from django.conf import settings
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Subscription, PayPalWebhookEvent
from .serializers import (
    SubscriptionSerializer,
    CreateSubscriptionSerializer,
    CreateOneTimePaymentSerializer,
)
from . import paypal

logger = logging.getLogger(__name__)


class SubscriptionPlansView(APIView):
    """Return available subscription plans with PayPal plan IDs and prices."""
    permission_classes = [AllowAny]

    def get(self, request):
        plans = {
            'free': {
                'name': 'Free',
                'price': '0',
                'billing': 'forever',
                'features': [
                    'Generate 1 personalized vaccine schedule',
                    'On-screen timeline view',
                    'Core & lifestyle vaccine recommendations',
                    'Plain-language explanations',
                ],
                'limitations': [
                    'No PDF download',
                    'No calendar export',
                    'No reminders',
                ],
            },
            'plan_unlock': {
                'name': 'Plan Unlock',
                'price': '19.99',
                'billing': 'one-time',
                'features': [
                    'Everything in Free',
                    'Printable PDF vaccine schedule',
                    'Add to Google, Apple & Outlook calendars',
                    'Email delivery of your plan',
                    'Unlimited re-downloads',
                    'Multi-pet dashboard',
                ],
            },
            'pro': {
                'name': 'Pro Care Plan',
                'price': '29.00',
                'billing': 'year',
                'features': [
                    'Everything in Plan Unlock',
                    'Automated email reminders',
                    'Vaccine history storage',
                    'Multi-pet profiles',
                    'Yearly schedule regeneration',
                    'Priority updates when guidelines change',
                    'AI-powered vaccine assistant',
                ],
                'paypal_plan_id': getattr(settings, 'PAYPAL_PRO_ANNUAL_PLAN_ID', ''),
            },
        }
        return Response(plans)


class SubscriptionStatusView(APIView):
    """Get current user's subscription status."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            sub = request.user.subscription
            serializer = SubscriptionSerializer(sub)
            return Response(serializer.data)
        except Subscription.DoesNotExist:
            return Response(None)


class CreateOneTimePaymentView(APIView):
    """
    Activate Plan Unlock after PayPal one-time payment approval.

    Frontend creates a PayPal order, user approves, frontend captures,
    then sends order_id here for verification and activation.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateOneTimePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order_id = serializer.validated_data['order_id']

        # Verify with PayPal
        try:
            order_data = paypal.get_order_details(order_id)
        except Exception:
            logger.exception("Failed to verify PayPal order %s", order_id)
            return Response(
                {'error': 'Could not verify payment with PayPal.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        order_status = order_data.get('status', '').upper()
        if order_status != 'COMPLETED':
            return Response(
                {'error': f'Payment is not completed (status: {order_status}).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify amount
        purchase_units = order_data.get('purchase_units', [])
        if purchase_units:
            amount = purchase_units[0].get('amount', {})
            paid = amount.get('value', '0')
            if float(paid) < 19.99:
                return Response(
                    {'error': 'Payment amount is incorrect.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Create or update subscription (upgrade from free to plan_unlock)
        sub, created = Subscription.objects.update_or_create(
            user=request.user,
            defaults={
                'plan': 'plan_unlock',
                'billing_cycle': 'one_time',
                'status': 'active',
                'paypal_order_id': order_id,
                'paypal_subscription_id': None,
                'current_period_start': timezone.now(),
                'current_period_end': None,  # Never expires
                'cancelled_at': None,
            },
        )

        return Response(
            SubscriptionSerializer(sub).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CreateSubscriptionView(APIView):
    """
    Activate Pro subscription after PayPal approval.

    The frontend creates the subscription via PayPal JS SDK,
    then sends the subscription_id here for verification and activation.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        paypal_sub_id = serializer.validated_data['subscription_id']

        # Verify with PayPal
        try:
            pp_data = paypal.get_subscription_details(paypal_sub_id)
        except Exception:
            logger.exception("Failed to verify PayPal subscription %s", paypal_sub_id)
            return Response(
                {'error': 'Could not verify subscription with PayPal.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        pp_status = pp_data.get('status', '').upper()
        if pp_status not in ('ACTIVE', 'APPROVED'):
            return Response(
                {'error': f'Subscription is not active (status: {pp_status}).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Parse billing dates
        start_time = pp_data.get('start_time')
        billing_info = pp_data.get('billing_info', {})
        next_billing = billing_info.get('next_billing_time')

        period_start = date_parser.isoparse(start_time) if start_time else timezone.now()
        period_end = date_parser.isoparse(next_billing) if next_billing else None

        # Create or update subscription (upgrade to pro)
        sub, created = Subscription.objects.update_or_create(
            user=request.user,
            defaults={
                'plan': 'pro',
                'billing_cycle': 'annual',
                'status': 'active',
                'paypal_subscription_id': paypal_sub_id,
                'current_period_start': period_start,
                'current_period_end': period_end,
                'cancelled_at': None,
            },
        )

        return Response(
            SubscriptionSerializer(sub).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CancelSubscriptionView(APIView):
    """Cancel the current user's Pro subscription. Plan Unlock cannot be cancelled."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            sub = request.user.subscription
        except Subscription.DoesNotExist:
            return Response(
                {'error': 'No active subscription found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not sub.is_active:
            return Response(
                {'error': 'Subscription is not active.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if sub.billing_cycle == 'one_time':
            return Response(
                {'error': 'One-time purchases cannot be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Cancel on PayPal
        reason = request.data.get('reason', 'Cancelled by user')
        try:
            paypal.cancel_subscription(sub.paypal_subscription_id, reason)
        except Exception:
            logger.exception("Failed to cancel PayPal subscription %s", sub.paypal_subscription_id)
            return Response(
                {'error': 'Could not cancel subscription with PayPal.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Downgrade to plan_unlock (they keep one-time features)
        sub.plan = 'plan_unlock'
        sub.billing_cycle = 'one_time'
        sub.cancelled_at = timezone.now()
        sub.paypal_subscription_id = None
        sub.save(update_fields=['plan', 'billing_cycle', 'cancelled_at', 'paypal_subscription_id', 'updated_at'])

        return Response(SubscriptionSerializer(sub).data)


@method_decorator(csrf_exempt, name='dispatch')
class PayPalWebhookView(APIView):
    """
    Receive and process PayPal webhook events.
    No authentication required - uses webhook signature verification instead.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        # Parse raw body
        try:
            body = json.loads(request.body)
        except (json.JSONDecodeError, ValueError):
            return Response(status=status.HTTP_400_BAD_REQUEST)

        event_type = body.get('event_type', '')
        event_id = body.get('id', '')
        resource = body.get('resource', {})

        # Verify webhook signature
        webhook_headers = {
            'PAYPAL-AUTH-ALGO': request.META.get('HTTP_PAYPAL_AUTH_ALGO', ''),
            'PAYPAL-CERT-URL': request.META.get('HTTP_PAYPAL_CERT_URL', ''),
            'PAYPAL-TRANSMISSION-ID': request.META.get('HTTP_PAYPAL_TRANSMISSION_ID', ''),
            'PAYPAL-TRANSMISSION-SIG': request.META.get('HTTP_PAYPAL_TRANSMISSION_SIG', ''),
            'PAYPAL-TRANSMISSION-TIME': request.META.get('HTTP_PAYPAL_TRANSMISSION_TIME', ''),
        }

        if not paypal.verify_webhook_signature(webhook_headers, body):
            logger.warning("Invalid PayPal webhook signature for event %s", event_id)
            return Response(status=status.HTTP_403_FORBIDDEN)

        # Deduplicate
        if PayPalWebhookEvent.objects.filter(event_id=event_id).exists():
            return Response(status=status.HTTP_200_OK)

        # Store event
        PayPalWebhookEvent.objects.create(
            event_id=event_id,
            event_type=event_type,
            resource_id=resource.get('id', ''),
            payload=body,
            processed=False,
        )

        # Process event
        paypal_sub_id = resource.get('id', '')
        try:
            self._process_event(event_type, paypal_sub_id, resource)
            PayPalWebhookEvent.objects.filter(event_id=event_id).update(processed=True)
        except Exception:
            logger.exception("Failed to process webhook event %s", event_id)

        return Response(status=status.HTTP_200_OK)

    def _process_event(self, event_type, paypal_sub_id, resource):
        if not paypal_sub_id:
            return

        try:
            sub = Subscription.objects.get(paypal_subscription_id=paypal_sub_id)
        except Subscription.DoesNotExist:
            logger.info("No subscription found for PayPal ID %s", paypal_sub_id)
            return

        if event_type == 'BILLING.SUBSCRIPTION.ACTIVATED':
            sub.status = 'active'
            billing_info = resource.get('billing_info', {})
            next_billing = billing_info.get('next_billing_time')
            if next_billing:
                sub.current_period_end = date_parser.isoparse(next_billing)
            sub.save(update_fields=['status', 'current_period_end', 'updated_at'])

        elif event_type == 'BILLING.SUBSCRIPTION.CANCELLED':
            # Downgrade to plan_unlock instead of fully cancelling
            sub.plan = 'plan_unlock'
            sub.billing_cycle = 'one_time'
            sub.cancelled_at = timezone.now()
            sub.paypal_subscription_id = None
            sub.save(update_fields=['plan', 'billing_cycle', 'cancelled_at', 'paypal_subscription_id', 'updated_at'])

        elif event_type == 'BILLING.SUBSCRIPTION.SUSPENDED':
            sub.status = 'suspended'
            sub.save(update_fields=['status', 'updated_at'])

        elif event_type == 'BILLING.SUBSCRIPTION.EXPIRED':
            sub.status = 'expired'
            sub.save(update_fields=['status', 'updated_at'])

        elif event_type == 'PAYMENT.SALE.COMPLETED':
            billing_info = resource.get('billing_info', {})
            next_billing = billing_info.get('next_billing_time')
            if next_billing:
                sub.current_period_end = date_parser.isoparse(next_billing)
                sub.status = 'active'
                sub.save(update_fields=['status', 'current_period_end', 'updated_at'])
