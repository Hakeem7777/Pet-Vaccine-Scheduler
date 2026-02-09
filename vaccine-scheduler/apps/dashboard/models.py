from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.config import (
    REMINDER_DEFAULT_LEAD_TIME_DAYS,
    REMINDER_DEFAULT_INTERVAL_HOURS,
    REMINDER_MIN_INTERVAL_HOURS,
    REMINDER_MAX_LEAD_TIME_DAYS,
)


class ContactSubmission(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    subject = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'contact_submissions'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.subject}"


class ReminderPreference(models.Model):
    """Per-user vaccination reminder preferences. One record per user, applies to all their dogs."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reminder_preference',
    )
    reminders_enabled = models.BooleanField(default=False)
    lead_time_days = models.PositiveIntegerField(
        default=REMINDER_DEFAULT_LEAD_TIME_DAYS,
        help_text="How many days before due date to start reminding",
    )
    interval_hours = models.PositiveIntegerField(
        default=REMINDER_DEFAULT_INTERVAL_HOURS,
        help_text="Hours between repeat reminders for the same vaccine",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'reminder_preferences'

    def __str__(self):
        status = "ON" if self.reminders_enabled else "OFF"
        return f"{self.user.email} - Reminders {status}"

    def clean(self):
        if self.interval_hours < REMINDER_MIN_INTERVAL_HOURS:
            raise ValidationError({
                'interval_hours': f'Minimum interval is {REMINDER_MIN_INTERVAL_HOURS} hour(s).'
            })
        if self.lead_time_days > REMINDER_MAX_LEAD_TIME_DAYS:
            raise ValidationError({
                'lead_time_days': f'Maximum lead time is {REMINDER_MAX_LEAD_TIME_DAYS} days.'
            })


class ReminderLog(models.Model):
    """Tracks sent reminders to avoid duplicate emails."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reminder_logs',
    )
    dog = models.ForeignKey(
        'patients.Dog',
        on_delete=models.CASCADE,
        related_name='reminder_logs',
    )
    vaccine_id = models.CharField(max_length=50)
    dose_number = models.IntegerField(null=True, blank=True)
    scheduled_date = models.DateField()
    sent_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'reminder_logs'
        ordering = ['-sent_at']
        indexes = [
            models.Index(
                fields=['user', 'dog', 'vaccine_id', 'dose_number', 'scheduled_date'],
                name='idx_reminder_unique_combo',
            ),
            models.Index(fields=['sent_at']),
        ]

    def __str__(self):
        return f"Reminder: {self.dog.name} - {self.vaccine_id} dose {self.dose_number} ({self.sent_at})"
