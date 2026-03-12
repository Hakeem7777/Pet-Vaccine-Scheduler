import os
import shutil

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.storage import FileSystemStorage
from django.db import models
from django.utils import timezone

from apps.storage.validators import validate_video_file
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


class LeadCapture(models.Model):
    """Captures guest user emails for lead generation."""
    email = models.EmailField()
    source = models.CharField(max_length=50, default='guest_schedule')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lead_captures'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.email} ({self.source})"


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
    preferred_hour = models.PositiveIntegerField(
        default=0,
        help_text="Hour of day (0-23) when the user prefers to receive emails",
    )
    preferred_timezone = models.CharField(
        max_length=50,
        default='UTC',
        help_text="User's preferred timezone for email scheduling",
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
        if self.preferred_hour > 23:
            raise ValidationError({
                'preferred_hour': 'Hour must be between 0 and 23.'
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


class TokenUsage(models.Model):
    """Tracks LLM token consumption per user per request."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='token_usages',
    )
    endpoint = models.CharField(
        max_length=100,
        help_text="API endpoint that triggered the LLM call",
    )
    model_name = models.CharField(max_length=100, blank=True, default='')
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    total_tokens = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'token_usages'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['endpoint']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.endpoint} ({self.total_tokens} tokens)"


def _get_landing_video_storage():
    return FileSystemStorage(location=str(settings.LANDING_PAGE_VIDEO_ROOT))


class LandingPageVideo(models.Model):
    """Manages demo videos shown on landing pages. Saved to frontend public/videos/."""

    PAGE_TYPE_CHOICES = [
        ('b2c', 'B2C (Pet Owners)'),
        ('b2b', 'B2B (Clinics)'),
    ]
    DEMO_FILENAMES = {
        'b2c': 'demo-b2c.mp4',
        'b2b': 'demo-b2b.mp4',
    }

    title = models.CharField(max_length=255, help_text='Internal label for this video')
    page_type = models.CharField(
        max_length=3,
        choices=PAGE_TYPE_CHOICES,
        default='b2c',
        help_text='Which landing page this video is for',
    )
    video_file = models.FileField(
        upload_to='',
        storage=_get_landing_video_storage,
        validators=[validate_video_file],
        help_text='Upload MP4/WebM/Ogg — will be saved to frontend public/videos/',
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Only one video can be active per page type.',
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'landing_page_videos'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.title} ({self.get_page_type_display()}, {'active' if self.is_active else 'inactive'})"

    def save(self, *args, **kwargs):
        # Deactivate other videos of the same page type
        if self.is_active:
            LandingPageVideo.objects.filter(
                is_active=True, page_type=self.page_type
            ).exclude(pk=self.pk).update(is_active=False)

        super().save(*args, **kwargs)

        # Copy to the page-specific demo file so the frontend reference doesn't break
        if self.is_active and self.video_file:
            src = self.video_file.path
            filename = self.DEMO_FILENAMES.get(self.page_type, f'demo-{self.page_type}.mp4')
            dest = os.path.join(str(settings.LANDING_PAGE_VIDEO_ROOT), filename)
            if os.path.abspath(src) != os.path.abspath(dest):
                shutil.copy2(src, dest)
