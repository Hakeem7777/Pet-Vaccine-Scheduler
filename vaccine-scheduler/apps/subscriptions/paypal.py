import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

PAYPAL_API_BASE = {
    'sandbox': 'https://api-m.sandbox.paypal.com',
    'live': 'https://api-m.paypal.com',
}


def _get_base_url():
    mode = getattr(settings, 'PAYPAL_MODE', 'sandbox')
    return PAYPAL_API_BASE.get(mode, PAYPAL_API_BASE['sandbox'])


def get_access_token():
    """Get PayPal OAuth2 access token using client credentials."""
    url = f"{_get_base_url()}/v1/oauth2/token"
    response = requests.post(
        url,
        auth=(settings.PAYPAL_CLIENT_ID, settings.PAYPAL_CLIENT_SECRET),
        data={'grant_type': 'client_credentials'},
        headers={'Accept': 'application/json'},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()['access_token']


def _auth_headers():
    token = get_access_token()
    return {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }


# --- One-Time Orders (Plan Unlock) ---

def capture_order(order_id):
    """Capture a PayPal order after buyer approval (one-time payment)."""
    url = f"{_get_base_url()}/v2/checkout/orders/{order_id}/capture"
    response = requests.post(url, headers=_auth_headers(), timeout=30)
    response.raise_for_status()
    return response.json()


def get_order_details(order_id):
    """Fetch order details from PayPal."""
    url = f"{_get_base_url()}/v2/checkout/orders/{order_id}"
    response = requests.get(url, headers=_auth_headers(), timeout=30)
    response.raise_for_status()
    return response.json()


# --- Subscriptions (Pro Plan) ---

def get_subscription_details(subscription_id):
    """Fetch subscription details from PayPal."""
    url = f"{_get_base_url()}/v1/billing/subscriptions/{subscription_id}"
    response = requests.get(url, headers=_auth_headers(), timeout=30)
    response.raise_for_status()
    return response.json()


def cancel_subscription(subscription_id, reason='Cancelled by user'):
    """Cancel a subscription via PayPal API."""
    url = f"{_get_base_url()}/v1/billing/subscriptions/{subscription_id}/cancel"
    response = requests.post(
        url,
        headers=_auth_headers(),
        json={'reason': reason},
        timeout=30,
    )
    response.raise_for_status()
    return True


# --- Webhook Verification ---

def verify_webhook_signature(headers, body, webhook_id=None):
    """Verify PayPal webhook signature authenticity."""
    url = f"{_get_base_url()}/v1/notifications/verify-webhook-signature"
    verify_data = {
        'auth_algo': headers.get('PAYPAL-AUTH-ALGO', ''),
        'cert_url': headers.get('PAYPAL-CERT-URL', ''),
        'transmission_id': headers.get('PAYPAL-TRANSMISSION-ID', ''),
        'transmission_sig': headers.get('PAYPAL-TRANSMISSION-SIG', ''),
        'transmission_time': headers.get('PAYPAL-TRANSMISSION-TIME', ''),
        'webhook_id': webhook_id or settings.PAYPAL_WEBHOOK_ID,
        'webhook_event': body,
    }
    try:
        response = requests.post(
            url,
            headers=_auth_headers(),
            json=verify_data,
            timeout=30,
        )
        response.raise_for_status()
        result = response.json()
        return result.get('verification_status') == 'SUCCESS'
    except Exception:
        logger.exception("PayPal webhook signature verification failed")
        return False
