"""
Management command to send vaccination reminder emails.
Run via cron: python manage.py send_reminders
"""
import datetime
import logging
import os

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.dashboard.models import ReminderPreference, ReminderLog
from apps.patients.models import Dog
from apps.vaccinations.services import scheduler_service

logger = logging.getLogger(__name__)


def get_noncore_for_dog(dog):
    """
    Derive noncore vaccine selections from the dog's environment flags.
    Mirrors the frontend logic in ScheduleView.jsx.
    """
    selected = []
    if dog.env_daycare_boarding or dog.env_dog_parks or dog.env_travel_shows:
        selected.append('noncore_bord_in')
        selected.append('noncore_flu')
    if dog.env_tick_exposure:
        selected.append('noncore_lyme')
    return selected


class Command(BaseCommand):
    help = 'Send vaccination reminder emails to users who have reminders enabled'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print what would be sent without actually sending emails',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()
        today = now.date()

        prefs = (
            ReminderPreference.objects
            .filter(reminders_enabled=True)
            .select_related('user')
        )

        if not prefs.exists():
            self.stdout.write("No users have reminders enabled.")
            return

        if not os.environ.get('RESEND_API_KEY') and not dry_run:
            self.stderr.write(
                self.style.ERROR("RESEND_API_KEY not set. Cannot send emails.")
            )
            return

        email_service = None
        if not dry_run:
            from apps.email_service.services import EmailService
            try:
                email_service = EmailService()
            except ValueError as e:
                self.stderr.write(self.style.ERROR(str(e)))
                return

        total_sent = 0
        total_skipped = 0
        total_errors = 0

        for pref in prefs:
            user = pref.user
            dogs = Dog.objects.filter(owner=user)

            if not dogs.exists():
                continue

            lead_time_days = pref.lead_time_days
            interval_hours = pref.interval_hours

            for dog in dogs:
                selected_noncore = get_noncore_for_dog(dog)

                try:
                    schedule = scheduler_service.calculate_schedule_for_dog(
                        dog=dog,
                        selected_noncore=selected_noncore,
                        reference_date=today,
                    )
                except Exception as e:
                    logger.error(
                        f"Error calculating schedule for dog {dog.id} ({dog.name}): {e}"
                    )
                    continue

                # Collect candidates: overdue + items within lead_time window
                candidates = []

                for item in schedule.get('overdue', []):
                    candidates.append(item)

                for item in schedule.get('upcoming', []):
                    if item.get('days_until', 999) <= lead_time_days:
                        candidates.append(item)

                for item in schedule.get('future', []):
                    if item.get('days_until', 999) <= lead_time_days:
                        candidates.append(item)

                for item in candidates:
                    vaccine_id = item.get('vaccine_id', '')
                    vaccine_name = item.get('vaccine', 'Unknown Vaccine')
                    dose_info = item.get('dose', 'N/A')
                    dose_number = item.get('dose_number')
                    due_date_str = item.get('date', '')
                    days_overdue = item.get('days_overdue')
                    days_until = item.get('days_until')

                    if days_overdue is not None:
                        days_remaining = -days_overdue
                    elif days_until is not None:
                        days_remaining = days_until
                    else:
                        continue

                    try:
                        due_date = datetime.datetime.strptime(due_date_str, "%Y-%m-%d").date()
                    except (ValueError, TypeError):
                        continue

                    # Check if a reminder was sent recently enough
                    last_log = (
                        ReminderLog.objects
                        .filter(
                            user=user,
                            dog=dog,
                            vaccine_id=vaccine_id,
                            dose_number=dose_number,
                            scheduled_date=due_date,
                        )
                        .order_by('-sent_at')
                        .first()
                    )

                    if last_log:
                        time_since_last = now - last_log.sent_at
                        if time_since_last < datetime.timedelta(hours=interval_hours):
                            total_skipped += 1
                            continue

                    formatted_due_date = due_date.strftime("%B %d, %Y")
                    user_name = user.first_name or user.username or user.email

                    if dry_run:
                        self.stdout.write(
                            f"  [DRY RUN] Would send to {user.email}: "
                            f"{dog.name} - {vaccine_name} ({dose_info}) "
                            f"due {formatted_due_date} ({days_remaining} days)"
                        )
                        total_sent += 1
                        continue

                    result = email_service.send_reminder_email(
                        to_email=user.email,
                        user_name=user_name,
                        dog_name=dog.name,
                        vaccine_name=vaccine_name,
                        dose_info=dose_info,
                        due_date=formatted_due_date,
                        days_remaining=days_remaining,
                    )

                    if result['success']:
                        ReminderLog.objects.create(
                            user=user,
                            dog=dog,
                            vaccine_id=vaccine_id,
                            dose_number=dose_number,
                            scheduled_date=due_date,
                            sent_at=now,
                        )
                        total_sent += 1
                        logger.info(
                            f"Sent reminder to {user.email} for {dog.name} - {vaccine_name}"
                        )
                    else:
                        total_errors += 1
                        logger.error(
                            f"Failed to send reminder to {user.email}: {result['message']}"
                        )

        prefix = "[DRY RUN] " if dry_run else ""
        self.stdout.write(
            self.style.SUCCESS(
                f"\n{prefix}Reminders complete: "
                f"{total_sent} sent, {total_skipped} skipped (too recent), "
                f"{total_errors} errors"
            )
        )
