from django.contrib import admin

from .models import ContactSubmission, ReminderPreference, ReminderLog, TokenUsage


@admin.register(ContactSubmission)
class ContactSubmissionAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'subject', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']
    search_fields = ['name', 'email', 'subject']
    readonly_fields = ['name', 'email', 'subject', 'message', 'created_at']


@admin.register(ReminderPreference)
class ReminderPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'reminders_enabled', 'lead_time_days', 'interval_hours', 'updated_at']
    list_filter = ['reminders_enabled']
    search_fields = ['user__email']


@admin.register(ReminderLog)
class ReminderLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'dog', 'vaccine_id', 'dose_number', 'scheduled_date', 'sent_at']
    list_filter = ['sent_at']
    search_fields = ['user__email', 'dog__name', 'vaccine_id']
    readonly_fields = ['user', 'dog', 'vaccine_id', 'dose_number', 'scheduled_date', 'sent_at']


@admin.register(TokenUsage)
class TokenUsageAdmin(admin.ModelAdmin):
    list_display = ['user', 'endpoint', 'model_name', 'input_tokens', 'output_tokens', 'total_tokens', 'created_at']
    list_filter = ['endpoint', 'model_name', 'created_at']
    search_fields = ['user__email', 'endpoint']
    readonly_fields = ['user', 'endpoint', 'model_name', 'input_tokens', 'output_tokens', 'total_tokens', 'created_at']
