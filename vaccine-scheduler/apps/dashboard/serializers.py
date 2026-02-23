from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.patients.models import Dog
from apps.vaccinations.models import VaccinationRecord
from .models import ContactSubmission, ReminderPreference, TokenUsage

User = get_user_model()


class AdminUserSerializer(serializers.ModelSerializer):
    dog_count = serializers.SerializerMethodField()
    vaccination_count = serializers.SerializerMethodField()
    total_tokens_used = serializers.SerializerMethodField()
    ai_call_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'clinic_name', 'phone', 'is_staff', 'is_active',
            'date_joined', 'dog_count', 'vaccination_count',
            'total_tokens_used', 'ai_call_count',
        ]

    def get_dog_count(self, obj):
        return getattr(obj, '_dog_count', 0) or 0

    def get_vaccination_count(self, obj):
        return getattr(obj, '_vaccination_count', 0) or 0

    def get_total_tokens_used(self, obj):
        return getattr(obj, '_total_tokens_used', 0) or 0

    def get_ai_call_count(self, obj):
        return getattr(obj, '_ai_call_count', 0) or 0


class AdminDogSerializer(serializers.ModelSerializer):
    owner_email = serializers.CharField(source='owner.email', read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    age_weeks = serializers.IntegerField(read_only=True)
    age_classification = serializers.CharField(read_only=True)
    vaccination_count = serializers.SerializerMethodField()

    class Meta:
        model = Dog
        fields = [
            'id', 'name', 'breed', 'sex', 'birth_date', 'weight_kg',
            'owner_email', 'owner_username', 'age_weeks', 'age_classification',
            'vaccination_count', 'created_at',
        ]

    def get_vaccination_count(self, obj):
        return obj.vaccination_records.count()


class AdminVaccinationRecordSerializer(serializers.ModelSerializer):
    dog_name = serializers.CharField(source='dog.name', read_only=True)
    owner_email = serializers.CharField(source='dog.owner.email', read_only=True)
    vaccine_name = serializers.CharField(source='vaccine.name', read_only=True)

    class Meta:
        model = VaccinationRecord
        fields = [
            'id', 'dog_name', 'owner_email', 'vaccine_name',
            'date_administered', 'dose_number', 'notes', 'administered_by',
            'created_at',
        ]


class ContactSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactSubmission
        fields = '__all__'


class DashboardDogSummarySerializer(serializers.ModelSerializer):
    age_classification = serializers.CharField(read_only=True)
    vaccination_count = serializers.SerializerMethodField()

    class Meta:
        model = Dog
        fields = ['id', 'name', 'breed', 'age_classification', 'vaccination_count']

    def get_vaccination_count(self, obj):
        return obj.vaccination_records.count()


class DashboardRecentVaccinationSerializer(serializers.ModelSerializer):
    dog_name = serializers.CharField(source='dog.name', read_only=True)
    vaccine_name = serializers.CharField(source='vaccine.name', read_only=True)

    class Meta:
        model = VaccinationRecord
        fields = ['id', 'dog_name', 'vaccine_name', 'date_administered', 'dose_number']


class TokenUsageSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = TokenUsage
        fields = [
            'id', 'user_email', 'endpoint', 'model_name',
            'input_tokens', 'output_tokens', 'total_tokens', 'created_at',
        ]


class ReminderPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReminderPreference
        fields = [
            'reminders_enabled', 'lead_time_days', 'interval_hours',
            'preferred_hour', 'preferred_timezone', 'updated_at',
        ]
        read_only_fields = ['updated_at']

    def validate_interval_hours(self, value):
        from core.config import REMINDER_MIN_INTERVAL_HOURS
        if value < REMINDER_MIN_INTERVAL_HOURS:
            raise serializers.ValidationError(
                f'Minimum interval is {REMINDER_MIN_INTERVAL_HOURS} hour(s).'
            )
        return value

    def validate_lead_time_days(self, value):
        from core.config import REMINDER_MAX_LEAD_TIME_DAYS
        if value < 1:
            raise serializers.ValidationError('Lead time must be at least 1 day.')
        if value > REMINDER_MAX_LEAD_TIME_DAYS:
            raise serializers.ValidationError(
                f'Maximum lead time is {REMINDER_MAX_LEAD_TIME_DAYS} days.'
            )
        return value

    def validate_preferred_hour(self, value):
        if value < 0 or value > 23:
            raise serializers.ValidationError('Hour must be between 0 and 23.')
        return value

    def validate_preferred_timezone(self, value):
        from zoneinfo import available_timezones
        if value not in available_timezones():
            raise serializers.ValidationError(f'Invalid timezone: {value}')
        return value
