from django.contrib import admin

from .models import Subscription, PayPalWebhookEvent, PromoCode, PromoCodeRedemption


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


@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = ['code', 'duration_days', 'max_uses', 'times_used', 'is_active', 'expires_at', 'created_at']
    list_filter = ['is_active']
    search_fields = ['code']
    readonly_fields = ['times_used', 'created_at', 'updated_at']


@admin.register(PromoCodeRedemption)
class PromoCodeRedemptionAdmin(admin.ModelAdmin):
    list_display = ['promo_code', 'user', 'redeemed_at']
    list_filter = ['promo_code']
    search_fields = ['user__email', 'promo_code__code']
    readonly_fields = ['redeemed_at']
