import logging

import stripe
from django.conf import settings

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY


def create_checkout_session(price_id, user, success_url, cancel_url):
    """Create a Stripe Checkout Session for a subscription."""
    session = stripe.checkout.Session.create(
        mode='subscription',
        customer_email=user.email,
        line_items=[{'price': price_id, 'quantity': 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            'user_id': str(user.pk),
        },
    )
    return session


def cancel_subscription(stripe_subscription_id):
    """Cancel a Stripe subscription."""
    stripe.Subscription.cancel(stripe_subscription_id)
    return True


def refund_subscription(stripe_subscription_id):
    """Refund the latest invoice payment for a Stripe subscription."""
    invoices = stripe.Invoice.list(subscription=stripe_subscription_id, limit=1)
    if not invoices.data:
        raise ValueError("No invoices found for subscription")
    invoice = invoices.data[0]
    payment_intent_id = invoice.payment_intent
    if not payment_intent_id:
        raise ValueError("No payment intent found on invoice")
    refund = stripe.Refund.create(payment_intent=payment_intent_id)
    return refund


def construct_webhook_event(payload, sig_header):
    """Verify and construct a Stripe webhook event."""
    return stripe.Webhook.construct_event(
        payload,
        sig_header,
        settings.STRIPE_WEBHOOK_SECRET,
    )
