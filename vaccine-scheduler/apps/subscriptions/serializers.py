from rest_framework import serializers

from .models import Subscription


class SubscriptionSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(read_only=True)
    is_paid = serializers.BooleanField(read_only=True)
    is_pro = serializers.BooleanField(read_only=True)
    can_export = serializers.BooleanField(read_only=True)
    can_use_reminders = serializers.BooleanField(read_only=True)
    can_use_multi_pet = serializers.BooleanField(read_only=True)
    dog_limit = serializers.IntegerField(read_only=True, allow_null=True)
    has_ai_chat = serializers.BooleanField(read_only=True)
    has_no_ads = serializers.BooleanField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'plan', 'billing_cycle', 'status', 'is_active',
            'is_paid', 'is_pro', 'can_export', 'can_use_reminders',
            'can_use_multi_pet', 'dog_limit', 'has_ai_chat', 'has_no_ads',
            'current_period_start', 'current_period_end', 'cancelled_at',
        ]
        read_only_fields = fields


class CreateSubscriptionSerializer(serializers.Serializer):
    """For Pro Care monthly subscription via PayPal Subscriptions API."""
    subscription_id = serializers.CharField(
        help_text="PayPal subscription ID returned after user approval"
    )
