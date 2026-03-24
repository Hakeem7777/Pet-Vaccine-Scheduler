from django.conf import settings
from django.db import models
from django.utils import timezone


class Subscription(models.Model):
    PLAN_CHOICES = [
        ('pro', 'Pro Care'),
    ]
    BILLING_CHOICES = [
        ('monthly', 'Monthly'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('cancelled', 'Cancelled'),
        ('suspended', 'Suspended'),
        ('expired', 'Expired'),
        ('pending', 'Pending'),
    ]
    PROVIDER_CHOICES = [
        ('paypal', 'PayPal'),
        ('stripe', 'Stripe'),
        ('promo', 'Promo Code'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscription',
    )
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES)
    billing_cycle = models.CharField(max_length=20, choices=BILLING_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default='paypal')
    paypal_subscription_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    paypal_order_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    stripe_subscription_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    stripe_customer_id = models.CharField(max_length=255, null=True, blank=True)
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)
    refund_amount = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    refund_id = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscriptions'

    def __str__(self):
        return f"{self.user.email} - {self.plan} ({self.status})"

    @property
    def is_active(self):
        if self.status not in ('active', 'pending'):
            return False
        if self.current_period_end and self.current_period_end < timezone.now():
            return False
        return True

    @property
    def is_paid(self):
        """Whether the user has an active Pro Care plan."""
        return self.is_active

    @property
    def is_pro(self):
        """Whether the user has an active Pro Care plan."""
        return self.is_active

    @property
    def can_export(self):
        """PDF download, calendar export, email delivery."""
        return self.is_active

    @property
    def can_use_reminders(self):
        """Automated email reminders."""
        return self.is_active

    @property
    def can_use_multi_pet(self):
        """Multiple pet profiles."""
        return self.is_active

    @property
    def dog_limit(self):
        if not self.is_active:
            return 1  # Free tier
        return None  # Pro Care: unlimited

    @property
    def has_ai_chat(self):
        """AI chatbot access."""
        return self.is_active

    @property
    def has_no_ads(self):
        """Ad-free experience."""
        return self.is_active

    @property
    def is_refund_eligible(self):
        """Eligible for full refund if within 2 days of creation and paid provider."""
        if self.payment_provider == 'promo':
            return False
        if self.refunded_at is not None:
            return False
        if not self.is_active:
            return False
        return (timezone.now() - self.created_at).total_seconds() <= 2 * 24 * 3600


class PromoCode(models.Model):
    code = models.CharField(max_length=50, unique=True)
    duration_days = models.PositiveIntegerField(help_text="Number of days the free subscription lasts")
    max_uses = models.PositiveIntegerField(null=True, blank=True, help_text="Leave blank for unlimited uses")
    times_used = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True, help_text="When the code itself expires")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'promo_codes'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.code} ({self.duration_days} days)"

    @property
    def is_valid(self):
        if not self.is_active:
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        if self.max_uses is not None and self.times_used >= self.max_uses:
            return False
        return True


class PromoCodeRedemption(models.Model):
    promo_code = models.ForeignKey(PromoCode, on_delete=models.CASCADE, related_name='redemptions')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='promo_redemptions',
    )
    redeemed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'promo_code_redemptions'
        unique_together = ('promo_code', 'user')
        ordering = ['-redeemed_at']

    def __str__(self):
        return f"{self.user.email} redeemed {self.promo_code.code}"


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


class StripeWebhookEvent(models.Model):
    event_id = models.CharField(max_length=255, unique=True)
    event_type = models.CharField(max_length=255)
    payload = models.JSONField()
    processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'stripe_webhook_events'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.event_type} - {self.event_id}"
