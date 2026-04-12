import logging
import os
import threading

import requests

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3"
BREVO_LIST_ID = int(os.getenv('BREVO_LIST_ID', '2'))


class BrevoService:
    """Manages contacts in Brevo marketing lists for onboarding automation."""

    def __init__(self):
        self.api_key = os.environ.get('BREVO_API_KEY')
        if not self.api_key:
            raise ValueError("BREVO_API_KEY environment variable is not set")
        self.headers = {
            "api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def create_or_update_contact(self, email, attributes, list_ids=None):
        """
        Create a contact or update if exists (upsert).
        Adds the contact to the specified Brevo lists.
        """
        if list_ids is None:
            list_ids = [BREVO_LIST_ID]

        payload = {
            "email": email,
            "attributes": attributes,
            "listIds": list_ids,
            "updateEnabled": True,
        }

        response = requests.post(
            f"{BREVO_API_URL}/contacts",
            headers=self.headers,
            json=payload,
            timeout=10,
        )
        response.raise_for_status()
        return response

    def update_contact_attributes(self, email, attributes):
        """Update attributes for an existing contact."""
        payload = {"attributes": attributes}

        response = requests.put(
            f"{BREVO_API_URL}/contacts/{email}",
            headers=self.headers,
            json=payload,
            timeout=10,
        )
        response.raise_for_status()
        return response


def _run_in_background(func, *args, **kwargs):
    """Run a Brevo API call in a background thread. Errors are logged, never raised."""
    def _wrapper():
        try:
            func(*args, **kwargs)
        except requests.exceptions.HTTPError as e:
            logger.warning("Brevo API error: %s - %s", e.response.status_code, e.response.text)
        except Exception:
            logger.warning("Brevo sync failed", exc_info=True)

    thread = threading.Thread(target=_wrapper, daemon=True)
    thread.start()


def sync_new_user(user):
    """Add a newly registered user to the Brevo onboarding list. Non-blocking."""
    if _brevo_service is None:
        return

    plan = "Free"
    try:
        if hasattr(user, 'subscription') and user.subscription.is_pro:
            plan = "Pro"
    except Exception:
        pass

    attributes = {
        "FIRSTNAME": user.first_name or "",
        "LASTNAME": user.last_name or "",
        "PLAN": plan,
        "SIGNUP_SOURCE": "registration",
        "USER_ID": str(user.id),
    }
    _run_in_background(
        _brevo_service.create_or_update_contact,
        email=user.email,
        attributes=attributes,
    )


def sync_plan_change(user, new_plan):
    """Update PLAN attribute in Brevo when subscription changes. Non-blocking."""
    if _brevo_service is None:
        return

    _run_in_background(
        _brevo_service.update_contact_attributes,
        email=user.email,
        attributes={"PLAN": new_plan},
    )


# Module-level singleton -- None when BREVO_API_KEY is not set
try:
    _brevo_service = BrevoService() if os.environ.get('BREVO_API_KEY') else None
except Exception:
    logger.warning("Failed to initialise BrevoService", exc_info=True)
    _brevo_service = None
