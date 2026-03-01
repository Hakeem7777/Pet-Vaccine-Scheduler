"""
Serializers for user authentication and profile management.
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'clinic_name', 'phone'
        ]
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': False},
            'last_name': {'required': False},
        }

    def validate(self, attrs: dict) -> dict:
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': "Passwords do not match."
            })
        return attrs

    def create(self, validated_data: dict) -> User:
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            clinic_name=validated_data.get('clinic_name', ''),
            phone=validated_data.get('phone', ''),
        )
        return user


class SubscriptionInlineSerializer(serializers.Serializer):
    """Inline serializer for subscription data in user profile."""
    plan = serializers.CharField()
    billing_cycle = serializers.CharField()
    status = serializers.CharField()
    is_active = serializers.BooleanField()
    is_paid = serializers.BooleanField()
    is_pro = serializers.BooleanField()
    can_export = serializers.BooleanField()
    can_use_reminders = serializers.BooleanField()
    can_use_multi_pet = serializers.BooleanField()
    dog_limit = serializers.IntegerField(allow_null=True)
    has_ai_chat = serializers.BooleanField()
    has_no_ads = serializers.BooleanField()
    current_period_start = serializers.DateTimeField()
    current_period_end = serializers.DateTimeField(allow_null=True)
    cancelled_at = serializers.DateTimeField(allow_null=True)


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for user profile display and updates.
    """
    subscription = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'clinic_name', 'phone', 'is_staff', 'date_joined', 'created_at', 'updated_at',
            'has_seen_dashboard_tour', 'has_seen_schedule_tour', 'subscription',
        ]
        read_only_fields = ['id', 'date_joined', 'created_at', 'updated_at', 'is_staff', 'subscription']

    def get_subscription(self, obj):
        try:
            sub = obj.subscription
            return SubscriptionInlineSerializer(sub).data
        except Exception:
            return None

    def validate_email(self, value):
        user = self.instance
        if user and User.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value


class PasswordChangeSerializer(serializers.Serializer):
    """
    Serializer for password change.
    """
    old_password = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )

    def validate(self, attrs: dict) -> dict:
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': "New passwords do not match."
            })
        return attrs

    def validate_old_password(self, value: str) -> str:
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value


class PendingRegistrationSerializer(serializers.Serializer):
    """
    Serializer for pending registration (before OTP verification).
    Validates the same fields as UserRegistrationSerializer but does not create a User.
    """
    username = serializers.CharField(max_length=150, required=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    clinic_name = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')

    def validate(self, attrs: dict) -> dict:
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': "Passwords do not match."
            })
        return attrs

    def validate_email(self, value: str) -> str:
        # Don't reveal whether the email exists - the view's update_or_create
        # handles duplicates, and OTP verification uses generic errors.
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer for password reset request (sends email with reset link).
    """
    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for password reset confirmation (sets new password).
    """
    uidb64 = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )

    def validate(self, attrs: dict) -> dict:
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': "Passwords do not match."
            })
        return attrs


class OTPVerificationSerializer(serializers.Serializer):
    """
    Serializer for OTP verification request.
    """
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(max_length=6, min_length=6, required=True)


class ResendOTPSerializer(serializers.Serializer):
    """
    Serializer for resend OTP request.
    """
    email = serializers.EmailField(required=True)
