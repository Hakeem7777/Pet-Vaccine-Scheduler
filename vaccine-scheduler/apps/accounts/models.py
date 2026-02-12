"""
Custom User model for the vaccine scheduler application.
"""
import hmac
import secrets
import string
from datetime import timedelta

from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    """
    Custom user model with additional veterinary-specific fields.
    Uses email as the unique identifier for authentication instead of username.
    """
    username = models.CharField(max_length=150)
    email = models.EmailField(unique=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    clinic_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Name of the veterinary clinic"
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        help_text="Contact phone number"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self) -> str:
        return self.username


class PendingRegistration(models.Model):
    """
    Temporary storage for registration data until OTP is verified.
    The actual User is only created after successful OTP verification.
    """
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150)
    password_hash = models.CharField(max_length=128)
    first_name = models.CharField(max_length=150, blank=True, default='')
    last_name = models.CharField(max_length=150, blank=True, default='')
    clinic_name = models.CharField(max_length=255, blank=True, default='')
    phone = models.CharField(max_length=20, blank=True, default='')
    otp = models.CharField(max_length=6)
    otp_expires_at = models.DateTimeField()
    otp_attempts = models.IntegerField(default=0)
    otp_locked_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pending_registrations'

    def __str__(self) -> str:
        return f"Pending: {self.email}"

    def is_otp_locked(self) -> bool:
        """Check if OTP verification is locked due to too many failed attempts."""
        if self.otp_locked_until and timezone.now() < self.otp_locked_until:
            return True
        return False

    def is_otp_valid(self, otp_input: str) -> bool:
        return hmac.compare_digest(self.otp, otp_input) and timezone.now() < self.otp_expires_at

    def record_failed_otp_attempt(self):
        """Record a failed OTP attempt and lock if threshold exceeded."""
        self.otp_attempts += 1
        if self.otp_attempts >= 5:
            self.otp_locked_until = timezone.now() + timedelta(minutes=15)
        self.save(update_fields=['otp_attempts', 'otp_locked_until'])

    def reset_otp_attempts(self):
        """Reset OTP attempt counter after successful verification."""
        self.otp_attempts = 0
        self.otp_locked_until = None
        self.save(update_fields=['otp_attempts', 'otp_locked_until'])

    def generate_otp(self):
        self.otp = ''.join(secrets.choice(string.digits) for _ in range(6))
        self.otp_expires_at = timezone.now() + timedelta(hours=1)
        self.otp_attempts = 0
        self.otp_locked_until = None

    @staticmethod
    def hash_password(raw_password: str) -> str:
        return make_password(raw_password)


# Import AuditLog so Django discovers it for migrations
from .audit import AuditLog  # noqa: E402, F401
