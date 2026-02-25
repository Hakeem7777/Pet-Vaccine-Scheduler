from django.conf import settings
from django.db import models
from django.utils import timezone


class Subscription(models.Model):
    PLAN_CHOICES = [
        ('plan_unlock', 'Plan Unlock'),
        ('pro', 'Pro'),
    ]
    BILLING_CHOICES = [
        ('one_time', 'One-Time'),
        ('annual', 'Annual'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('cancelled', 'Cancelled'),
        ('suspended', 'Suspended'),
        ('expired', 'Expired'),
        ('pending', 'Pending'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscription',
    )
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES)
    billing_cycle = models.CharField(max_length=20, choices=BILLING_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    paypal_subscription_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    paypal_order_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscriptions'

    def __str__(self):
        return f"{self.user.email} - {self.plan} ({self.status})"

    @property
    def is_active(self):
        if self.status != 'active':
            return False
        # One-time purchases never expire
        if self.billing_cycle == 'one_time':
            return True
        # Annual subscriptions check period end
        if self.current_period_end and self.current_period_end < timezone.now():
            return False
        return True

    @property
    def is_paid(self):
        """Whether the user has any paid plan (plan_unlock or pro)."""
        return self.is_active

    @property
    def is_pro(self):
        """Whether the user has the Pro annual subscription."""
        return self.is_active and self.plan == 'pro'

    @property
    def can_export(self):
        """PDF download, calendar export, email delivery."""
        return self.is_active

    @property
    def can_use_reminders(self):
        """Automated email reminders - Pro only."""
        return self.is_pro

    @property
    def can_use_multi_pet(self):
        """Multiple pet profiles."""
        return self.is_active

    @property
    def dog_limit(self):
        if not self.is_active:
            return 1  # Free tier
        return None  # Both paid tiers: unlimited

    @property
    def has_ai_chat(self):
        """AI chatbot access - Pro only."""
        return self.is_pro


class PayPalWebhookEvent(models.Model):
    event_id = models.CharField(max_length=255, unique=True)
    event_type = models.CharField(max_length=255)
    resource_id = models.CharField(max_length=255, blank=True, default='')
    payload = models.JSONField()
    processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'paypal_webhook_events'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.event_type} - {self.event_id}"
