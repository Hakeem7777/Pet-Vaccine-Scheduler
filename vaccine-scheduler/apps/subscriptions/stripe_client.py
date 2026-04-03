import logging

import stripe
from django.conf import settings

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY
_client = stripe.StripeClient(settings.STRIPE_SECRET_KEY)


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


def retrieve_checkout_session(session_id):
    """Retrieve a Stripe Checkout Session by ID."""
    return stripe.checkout.Session.retrieve(session_id)


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
    # Stripe API 2025-03-31 removed invoice.payment_intent and invoice.charge.
    # Use StripeClient.invoice_payments.list() to get the payment intent.
    invoice_payments = _client.invoice_payments.list(params={
        'invoice': invoice.id,
        'status': 'paid',
    })
    if not invoice_payments.data:
        raise ValueError("No payments found on invoice")
    payment = invoice_payments.data[0].payment
    if payment.type == 'payment_intent':
        refund = _client.refunds.create(params={'payment_intent': payment.payment_intent})
    elif payment.type == 'charge':
        refund = _client.refunds.create(params={'charge': payment.charge})
    else:
        raise ValueError(f"Unknown payment type: {payment.type}")
    return refund


def construct_webhook_event(payload, sig_header):
    """Verify and construct a Stripe webhook event."""
    return stripe.Webhook.construct_event(
        payload,
        sig_header,
        settings.STRIPE_WEBHOOK_SECRET,
    )
