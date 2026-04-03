import logging
import json
import os

from datetime import timedelta

from dateutil import parser as date_parser
from django.conf import settings
from django.db import models
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from django.contrib.auth import get_user_model
from .models import Subscription, PayPalWebhookEvent, StripeWebhookEvent, PromoCode, PromoCodeRedemption
from .serializers import (
    SubscriptionSerializer,
    CreateSubscriptionSerializer,
    CreateStripeCheckoutSerializer,
    RedeemPromoCodeSerializer,
)
from . import paypal
from . import stripe_client

logger = logging.getLogger(__name__)


def _activate_subscription_from_checkout(session):
    """
    Create or update a Subscription from a completed Stripe checkout session.

    Shared by StripeWebhookView._handle_checkout_completed and
    VerifyStripeCheckoutView. Idempotent via update_or_create.

    Returns (subscription, created) or (None, False) if data is invalid.
    """
    user_id = session.get('metadata', {}).get('user_id')
    stripe_sub_id = session.get('subscription')
    stripe_customer_id = session.get('customer')

    if not user_id or not stripe_sub_id:
        return None, False

    User = get_user_model()
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.warning("Stripe checkout: user %s not found", user_id)
        return None, False

    sub, created = Subscription.objects.update_or_create(
        user=user,
        defaults={
            'plan': 'pro',
            'billing_cycle': 'monthly',
            'status': 'active',
            'payment_provider': 'stripe',
            'stripe_subscription_id': stripe_sub_id,
            'stripe_customer_id': stripe_customer_id,
            'paypal_subscription_id': None,
            'paypal_order_id': None,
            'current_period_start': timezone.now(),
            'cancelled_at': None,
            'refunded_at': None,
            'refund_amount': None,
            'refund_id': None,
        },
    )

    if not created:
        Subscription.objects.filter(pk=sub.pk).update(created_at=timezone.now())
        sub.refresh_from_db()

    # Send admin notification
    try:
        if os.environ.get('RESEND_API_KEY'):
            from apps.email_service.services import EmailService
            EmailService().send_subscription_notification(
                user_email=user.email,
                username=user.username,
                plan='Pro Care',
                paypal_subscription_id=f'stripe:{stripe_sub_id}',
            )
    except Exception:
        logger.warning("Failed to send Stripe subscription admin notification for user %s", user.email)

    # Send user confirmation email
    try:
        if os.environ.get('RESEND_API_KEY'):
            from apps.email_service.services import EmailService
            EmailService().send_subscription_confirmation_email(
                to_email=user.email,
                username=user.username,
                plan='Pro Care',
                price='$19.99',
                billing_cycle='monthly',
                period_start=timezone.now().strftime("%B %d, %Y"),
                period_end=None,
                is_promo=False,
            )
    except Exception:
        logger.warning("Failed to send subscription confirmation email to %s", user.email)

    return sub, created


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
                    'No exports (PDF, calendar, or email)',
                    'No reminders',
                ],
            },
            'pro': {
                'name': 'Pro Care Plan',
                'price': '19.99',
                'billing': 'month',
                'features': [
                    'Everything in Free',
                    'Printable PDF vaccine schedule',
                    'Add to Google, Apple & Outlook calendars',
                    'Email delivery of your plan',
                    'Unlimited re-downloads',
                    'Multi-pet dashboard',
                    'Automated email reminders',
                    'Vaccine history storage',
                    'Schedule regeneration',
                    'Priority updates when guidelines change',
                    'AI-powered vaccine assistant',
                ],
                'paypal_plan_id': getattr(settings, 'PAYPAL_PRO_MONTHLY_PLAN_ID', ''),
                'stripe_price_id': getattr(settings, 'STRIPE_PRO_MONTHLY_PRICE_ID', ''),
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


class CreateSubscriptionView(APIView):
    """
    Activate Pro Care subscription after PayPal approval.

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
        if pp_status not in ('ACTIVE', 'APPROVED', 'PENDING'):
            return Response(
                {'error': f'Subscription is not active (status: {pp_status}).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Credit card payments may start as PENDING until verified
        sub_status = 'active' if pp_status in ('ACTIVE', 'APPROVED') else 'pending'

        # Parse billing dates
        start_time = pp_data.get('start_time')
        billing_info = pp_data.get('billing_info', {})
        next_billing = billing_info.get('next_billing_time')

        period_start = date_parser.isoparse(start_time) if start_time else timezone.now()
        period_end = date_parser.isoparse(next_billing) if next_billing else None

        # Create or update subscription
        sub, created = Subscription.objects.update_or_create(
            user=request.user,
            defaults={
                'plan': 'pro',
                'billing_cycle': 'monthly',
                'status': sub_status,
                'payment_provider': 'paypal',
                'paypal_subscription_id': paypal_sub_id,
                'stripe_subscription_id': None,
                'stripe_customer_id': None,
                'current_period_start': period_start,
                'current_period_end': period_end,
                'cancelled_at': None,
                'refunded_at': None,
                'refund_amount': None,
                'refund_id': None,
            },
        )

        # Reset created_at on re-subscription so refund window starts fresh
        if not created:
            Subscription.objects.filter(pk=sub.pk).update(created_at=timezone.now())
            sub.refresh_from_db()

        # Send admin notification (non-blocking)
        try:
            if os.environ.get('RESEND_API_KEY'):
                from apps.email_service.services import EmailService
                EmailService().send_subscription_notification(
                    user_email=request.user.email,
                    username=request.user.username,
                    plan='Pro Care',
                    paypal_subscription_id=paypal_sub_id,
                )
        except Exception:
            logger.warning("Failed to send subscription admin notification for user %s", request.user.email)

        # Send user confirmation email (non-blocking)
        try:
            if os.environ.get('RESEND_API_KEY'):
                from apps.email_service.services import EmailService
                EmailService().send_subscription_confirmation_email(
                    to_email=request.user.email,
                    username=request.user.username,
                    plan='Pro Care',
                    price='$19.99',
                    billing_cycle='monthly',
                    period_start=period_start.strftime("%B %d, %Y"),
                    period_end=period_end.strftime("%B %d, %Y") if period_end else None,
                    is_promo=False,
                )
        except Exception:
            logger.warning("Failed to send subscription confirmation email to %s", request.user.email)

        return Response(
            SubscriptionSerializer(sub).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class RedeemPromoCodeView(APIView):
    """Redeem a promo code to get a free Pro Care subscription."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RedeemPromoCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code_value = serializer.validated_data['code'].strip().upper()

        # Look up the promo code
        try:
            promo = PromoCode.objects.get(code__iexact=code_value)
        except PromoCode.DoesNotExist:
            return Response(
                {'error': 'Invalid promo code.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check code is active
        if not promo.is_active:
            return Response(
                {'error': 'This promo code is no longer active.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check code hasn't expired
        if promo.expires_at and promo.expires_at < timezone.now():
            return Response(
                {'error': 'This promo code has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check max uses
        if promo.max_uses is not None and promo.times_used >= promo.max_uses:
            return Response(
                {'error': 'This promo code has reached its usage limit.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check user doesn't already have an active subscription
        try:
            existing_sub = request.user.subscription
            if existing_sub.is_active:
                return Response(
                    {'error': 'You already have an active subscription.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Subscription.DoesNotExist:
            pass

        # Check user hasn't already redeemed this code
        if PromoCodeRedemption.objects.filter(promo_code=promo, user=request.user).exists():
            return Response(
                {'error': 'You have already redeemed this promo code.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Activate subscription
        now = timezone.now()
        period_end = now + timedelta(days=promo.duration_days)

        sub, created = Subscription.objects.update_or_create(
            user=request.user,
            defaults={
                'plan': 'pro',
                'billing_cycle': 'monthly',
                'status': 'active',
                'payment_provider': 'promo',
                'paypal_subscription_id': None,
                'paypal_order_id': None,
                'stripe_subscription_id': None,
                'stripe_customer_id': None,
                'current_period_start': now,
                'current_period_end': period_end,
                'cancelled_at': None,
                'refunded_at': None,
                'refund_amount': None,
                'refund_id': None,
            },
        )

        # Reset created_at on re-subscription
        if not created:
            Subscription.objects.filter(pk=sub.pk).update(created_at=timezone.now())
            sub.refresh_from_db()

        # Record redemption and increment counter
        PromoCodeRedemption.objects.create(promo_code=promo, user=request.user)
        promo.times_used = models.F('times_used') + 1
        promo.save(update_fields=['times_used', 'updated_at'])

        # Send user confirmation email (non-blocking)
        try:
            if os.environ.get('RESEND_API_KEY'):
                from apps.email_service.services import EmailService
                EmailService().send_subscription_confirmation_email(
                    to_email=request.user.email,
                    username=request.user.username,
                    plan='Pro Care',
                    price='Free',
                    billing_cycle='promo',
                    period_start=now.strftime("%B %d, %Y"),
                    period_end=period_end.strftime("%B %d, %Y"),
                    is_promo=True,
                )
        except Exception:
            logger.warning("Failed to send subscription confirmation email to %s", request.user.email)

        return Response(
            SubscriptionSerializer(sub).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CancelSubscriptionView(APIView):
    """Cancel the current user's Pro Care subscription."""
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

        reason = request.data.get('reason', 'Cancelled by user')
        refunded = False
        refund_amount = None

        # Save provider IDs locally before any API calls (webhook may clear them)
        paypal_sub_id = sub.paypal_subscription_id
        stripe_sub_id = sub.stripe_subscription_id

        logger.info(
            "Cancel request for %s: paypal_id=%s, stripe_id=%s, provider=%s, "
            "is_refund_eligible=%s, created_at=%s, status=%s",
            request.user.email, paypal_sub_id, stripe_sub_id,
            sub.payment_provider, sub.is_refund_eligible, sub.created_at, sub.status,
        )

        # Process refund if eligible (within 2-day window)
        if sub.is_refund_eligible:
            if paypal_sub_id:
                try:
                    # Find the captured/sale payment to refund
                    # Use a wide time range — payment may predate created_at
                    txns = paypal.get_subscription_transactions(
                        paypal_sub_id,
                        sub.created_at - timedelta(days=3),
                        timezone.now() + timedelta(hours=1),
                    )
                    transactions = txns.get('transactions', [])
                    logger.info("PayPal transactions for %s: %s", paypal_sub_id, transactions)

                    txn_id = None
                    txn_amount = None
                    for txn in transactions:
                        if txn.get('status') == 'COMPLETED':
                            txn_id = txn.get('id')
                            # Extract amount from transaction
                            amount_info = txn.get('amount_with_breakdown', {})
                            gross = amount_info.get('gross_amount', {})
                            txn_amount = gross.get('value')
                            break

                    if txn_id:
                        # Try v1 sale refund first (PayPal Subscriptions use sale resources)
                        try:
                            refund_result = paypal.refund_sale(txn_id)
                            logger.info("PayPal sale refund result: %s", refund_result)
                        except Exception:
                            logger.info("v1 sale refund failed for %s, trying v2 capture refund", txn_id)
                            refund_result = paypal.refund_capture(txn_id)
                            logger.info("PayPal capture refund result: %s", refund_result)

                        actual_amount = float(txn_amount) if txn_amount else 19.99
                        sub.refunded_at = timezone.now()
                        sub.refund_amount = actual_amount
                        sub.refund_id = refund_result.get('id', '')
                        refunded = True
                        refund_amount = actual_amount
                    else:
                        logger.warning("No COMPLETED transactions found for PayPal sub %s", paypal_sub_id)
                except Exception:
                    logger.exception("Failed to refund PayPal subscription %s", paypal_sub_id)
                    return Response(
                        {'error': 'Could not process refund. Please try again or contact support.'},
                        status=status.HTTP_502_BAD_GATEWAY,
                    )
            elif stripe_sub_id:
                try:
                    refund_result = stripe_client.refund_subscription(stripe_sub_id)
                    sub.refunded_at = timezone.now()
                    sub.refund_amount = refund_result.amount / 100  # Stripe amounts are in cents
                    sub.refund_id = refund_result.id
                    refunded = True
                    refund_amount = float(sub.refund_amount)
                except Exception:
                    logger.exception("Failed to refund Stripe subscription %s", stripe_sub_id)
                    return Response(
                        {'error': 'Could not process refund. Please try again or contact support.'},
                        status=status.HTTP_502_BAD_GATEWAY,
                    )

        # Cancel on the payment provider
        if paypal_sub_id:
            try:
                paypal.cancel_subscription(paypal_sub_id, reason)
            except Exception:
                logger.exception("Failed to cancel PayPal subscription %s", paypal_sub_id)
                return Response(
                    {'error': 'Could not cancel subscription with PayPal.'},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
        elif stripe_sub_id:
            try:
                stripe_client.cancel_subscription(stripe_sub_id)
            except Exception:
                logger.exception("Failed to cancel Stripe subscription %s", stripe_sub_id)
                return Response(
                    {'error': 'Could not cancel subscription with Stripe.'},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        # Downgrade to free
        sub.status = 'cancelled'
        sub.cancelled_at = timezone.now()
        sub.paypal_subscription_id = None
        sub.stripe_subscription_id = None
        update_fields = ['status', 'cancelled_at', 'paypal_subscription_id', 'stripe_subscription_id', 'updated_at']
        if refunded:
            update_fields += ['refunded_at', 'refund_amount', 'refund_id']
        sub.save(update_fields=update_fields)

        # Send email notifications (non-blocking)
        try:
            if os.environ.get('RESEND_API_KEY'):
                from apps.email_service.services import EmailService
                email_service = EmailService()
                email_service.send_cancellation_notification(
                    user_email=request.user.email,
                    username=request.user.username,
                    reason=reason,
                )
                email_service.send_cancellation_confirmation_email(
                    to_email=request.user.email,
                    username=request.user.username,
                    refunded=refunded,
                    refund_amount=str(refund_amount) if refund_amount else None,
                )
        except Exception:
            logger.warning("Failed to send cancellation emails for user %s", request.user.email)

        data = SubscriptionSerializer(sub).data
        data['refunded'] = refunded
        if refund_amount is not None:
            data['refund_amount'] = refund_amount
        return Response(data)


class CreateStripeCheckoutView(APIView):
    """
    Create a Stripe Checkout Session for Pro Care subscription.

    Returns the checkout URL for the frontend to redirect to.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateStripeCheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        success_url = serializer.validated_data['success_url']
        cancel_url = serializer.validated_data['cancel_url']
        price_id = getattr(settings, 'STRIPE_PRO_MONTHLY_PRICE_ID', '')

        if not price_id:
            return Response(
                {'error': 'Stripe is not configured.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            session = stripe_client.create_checkout_session(
                price_id=price_id,
                user=request.user,
                success_url=success_url,
                cancel_url=cancel_url,
            )
        except Exception:
            logger.exception("Failed to create Stripe checkout session for user %s", request.user.email)
            return Response(
                {'error': 'Could not create checkout session.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({
            'session_id': session.id,
            'checkout_url': session.url,
        })


class VerifyStripeCheckoutView(APIView):
    """
    Verify a completed Stripe Checkout Session and activate the subscription.

    Called by the frontend on the success page to ensure the subscription
    is created even if the webhook hasn't arrived yet. Idempotent.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_id = request.data.get('session_id')
        if not session_id:
            return Response(
                {'error': 'session_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            session = stripe_client.retrieve_checkout_session(session_id)
        except Exception:
            logger.exception("Failed to retrieve Stripe session %s", session_id)
            return Response(
                {'error': 'Could not retrieve checkout session.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Convert StripeObject to dict so .get() works uniformly
        # (webhook passes a dict, but retrieve returns a StripeObject)
        session_data = session.to_dict()

        if session_data.get('status') != 'complete':
            return Response(
                {'error': 'Checkout session is not complete.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if session_data.get('mode') != 'subscription':
            return Response(
                {'error': 'Session is not a subscription checkout.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Security: verify the session belongs to this user
        session_user_id = session_data.get('metadata', {}).get('user_id')
        if str(request.user.pk) != str(session_user_id):
            return Response(
                {'error': 'Session does not belong to this user.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        sub, created = _activate_subscription_from_checkout(session_data)
        if sub is None:
            return Response(
                {'error': 'Could not activate subscription.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(SubscriptionSerializer(sub).data)


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """
    Receive and process Stripe webhook events.
    No authentication required — uses webhook signature verification.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')

        try:
            event = stripe_client.construct_webhook_event(payload, sig_header)
        except Exception:
            logger.warning("Invalid Stripe webhook signature")
            return Response(status=status.HTTP_400_BAD_REQUEST)

        event_id = event['id']
        event_type = event['type']

        # Deduplicate
        if StripeWebhookEvent.objects.filter(event_id=event_id).exists():
            return Response(status=status.HTTP_200_OK)

        # Store event
        StripeWebhookEvent.objects.create(
            event_id=event_id,
            event_type=event_type,
            payload=event,
            processed=False,
        )

        # Process event
        try:
            self._process_event(event_type, event['data']['object'])
            StripeWebhookEvent.objects.filter(event_id=event_id).update(processed=True)
        except Exception:
            logger.exception("Failed to process Stripe webhook event %s", event_id)

        return Response(status=status.HTTP_200_OK)

    def _process_event(self, event_type, obj):
        if event_type == 'checkout.session.completed':
            self._handle_checkout_completed(obj)
        elif event_type == 'customer.subscription.updated':
            self._handle_subscription_updated(obj)
        elif event_type == 'customer.subscription.deleted':
            self._handle_subscription_deleted(obj)
        elif event_type == 'invoice.payment_succeeded':
            self._handle_invoice_paid(obj)

    def _handle_checkout_completed(self, session):
        _activate_subscription_from_checkout(session)

    def _handle_subscription_updated(self, subscription):
        stripe_sub_id = subscription.get('id')
        if not stripe_sub_id:
            return

        try:
            sub = Subscription.objects.get(stripe_subscription_id=stripe_sub_id)
        except Subscription.DoesNotExist:
            return

        stripe_status = subscription.get('status', '')
        status_map = {
            'active': 'active',
            'past_due': 'suspended',
            'unpaid': 'suspended',
            'canceled': 'cancelled',
            'incomplete': 'pending',
            'incomplete_expired': 'expired',
            'trialing': 'active',
        }
        new_status = status_map.get(stripe_status, sub.status)
        sub.status = new_status

        current_period_end = subscription.get('current_period_end')
        if current_period_end:
            from datetime import datetime
            sub.current_period_end = datetime.fromtimestamp(
                current_period_end, tz=timezone.utc
            )

        sub.save(update_fields=['status', 'current_period_end', 'updated_at'])

    def _handle_subscription_deleted(self, subscription):
        stripe_sub_id = subscription.get('id')
        if not stripe_sub_id:
            return

        try:
            sub = Subscription.objects.get(stripe_subscription_id=stripe_sub_id)
        except Subscription.DoesNotExist:
            return

        sub.status = 'cancelled'
        sub.cancelled_at = timezone.now()
        sub.stripe_subscription_id = None
        sub.save(update_fields=['status', 'cancelled_at', 'stripe_subscription_id', 'updated_at'])

    def _handle_invoice_paid(self, invoice):
        stripe_sub_id = invoice.get('subscription')
        if not stripe_sub_id:
            return

        try:
            sub = Subscription.objects.get(stripe_subscription_id=stripe_sub_id)
        except Subscription.DoesNotExist:
            return

        period_end = invoice.get('lines', {}).get('data', [{}])[0].get('period', {}).get('end')
        if period_end:
            from datetime import datetime
            sub.current_period_end = datetime.fromtimestamp(
                period_end, tz=timezone.utc
            )
            sub.status = 'active'
            sub.save(update_fields=['status', 'current_period_end', 'updated_at'])


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
            # Only process if not already cancelled by CancelSubscriptionView
            # (which handles its own status update and refund logic)
            if sub.status != 'cancelled':
                sub.status = 'cancelled'
                sub.cancelled_at = timezone.now()
                sub.save(update_fields=['status', 'cancelled_at', 'updated_at'])

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


class RecordPdfExportView(APIView):
    """Record a PDF export. Pro users get unlimited; free users get 1."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        User = get_user_model()

        is_pro = False
        try:
            is_pro = user.subscription.is_pro
        except Subscription.DoesNotExist:
            pass

        # Free users get exactly 1 PDF export ever
        if not is_pro and user.pdf_exports_used >= 1:
            return Response({
                'allowed': False,
                'error': 'You\u2019ve used your free PDF export. Upgrade to Pro Care for unlimited exports.',
                'redirect': '/pricing',
            }, status=status.HTTP_403_FORBIDDEN)

        User.objects.filter(pk=user.pk).update(
            pdf_exports_used=models.F('pdf_exports_used') + 1
        )
        user.refresh_from_db(fields=['pdf_exports_used'])
        return Response({
            'allowed': True,
            'pdf_exports_used': user.pdf_exports_used,
        })
