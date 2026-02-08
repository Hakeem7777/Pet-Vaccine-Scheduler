"""
Custom User model for the vaccine scheduler application.
"""
import random
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
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pending_registrations'

    def __str__(self) -> str:
        return f"Pending: {self.email}"

    def is_otp_valid(self, otp_input: str) -> bool:
        return self.otp == otp_input and timezone.now() < self.otp_expires_at

    def generate_otp(self):
        self.otp = ''.join(random.choices(string.digits, k=6))
        self.otp_expires_at = timezone.now() + timedelta(hours=1)

    @staticmethod
    def hash_password(raw_password: str) -> str:
        return make_password(raw_password)
