from django.contrib import admin

from .models import Subscription, PayPalWebhookEvent


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'plan', 'billing_cycle', 'status', 'current_period_end', 'created_at']
    list_filter = ['plan', 'billing_cycle', 'status']
    search_fields = ['user__email', 'user__username', 'paypal_subscription_id']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(PayPalWebhookEvent)
class PayPalWebhookEventAdmin(admin.ModelAdmin):
    list_display = ['event_id', 'event_type', 'processed', 'created_at']
    list_filter = ['event_type', 'processed']
    readonly_fields = ['created_at']
