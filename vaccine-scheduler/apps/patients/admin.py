"""
Admin configuration for patients app.
"""
from django.contrib import admin

from .models import Dog


@admin.register(Dog)
class DogAdmin(admin.ModelAdmin):
    """Admin configuration for Dog model."""

    list_display = ['name', 'breed', 'owner', 'birth_date', 'age_classification', 'created_at']
    list_filter = ['sex', 'breed', 'created_at']
    search_fields = ['name', 'breed', 'owner__username']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Basic Information', {
            'fields': ('owner', 'name', 'breed', 'sex', 'birth_date', 'weight_kg')
        }),
        ('Living Environment', {
            'fields': ('env_indoor_only', 'env_dog_parks', 'env_daycare_boarding', 'env_travel_shows'),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ['created_at', 'updated_at']
