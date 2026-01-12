"""
Admin configuration for accounts app.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


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
