"""
Admin configuration for vaccinations app.
"""
from django.contrib import admin

from .models import Vaccine, VaccinationRecord


@admin.register(Vaccine)
class VaccineAdmin(admin.ModelAdmin):
    """Admin configuration for Vaccine model."""

    list_display = ['vaccine_id', 'name', 'vaccine_type', 'min_start_age_weeks', 'is_active']
    list_filter = ['vaccine_type', 'is_active']
    search_fields = ['vaccine_id', 'name']
    ordering = ['vaccine_type', 'name']

    fieldsets = (
        ('Basic Information', {
            'fields': ('vaccine_id', 'name', 'vaccine_type', 'is_active')
        }),
        ('Vaccination Rules', {
            'fields': ('min_start_age_weeks', 'rules_json'),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ['created_at', 'updated_at']


@admin.register(VaccinationRecord)
class VaccinationRecordAdmin(admin.ModelAdmin):
    """Admin configuration for VaccinationRecord model."""

    list_display = ['dog', 'vaccine', 'date_administered', 'dose_number', 'administered_by']
    list_filter = ['vaccine', 'date_administered']
    search_fields = ['dog__name', 'vaccine__name', 'administered_by']
    date_hierarchy = 'date_administered'
    ordering = ['-date_administered']

    fieldsets = (
        ('Vaccination Details', {
            'fields': ('dog', 'vaccine', 'date_administered', 'dose_number')
        }),
        ('Additional Information', {
            'fields': ('notes', 'administered_by'),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['dog', 'vaccine']
