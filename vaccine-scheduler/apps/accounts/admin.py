"""
Admin configuration for accounts app.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, PendingRegistration


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin configuration for custom User model."""

    list_display = ['username', 'email', 'clinic_name', 'is_staff', 'date_joined']
    list_filter = ['is_staff', 'is_superuser', 'is_active', 'date_joined']
    search_fields = ['username', 'email', 'clinic_name']
    ordering = ['-date_joined']

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Clinic Information', {
            'fields': ('clinic_name', 'phone'),
        }),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Clinic Information', {
            'fields': ('clinic_name', 'phone'),
        }),
    )


@admin.register(PendingRegistration)
class PendingRegistrationAdmin(admin.ModelAdmin):
    """Admin configuration for pending registrations."""
    list_display = ['email', 'username', 'otp_expires_at', 'created_at']
    list_filter = ['created_at']
    search_fields = ['email', 'username']
    readonly_fields = ['password_hash', 'otp']
