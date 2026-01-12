"""
Serializers for vaccination management.
"""
import datetime
from rest_framework import serializers

from .models import Vaccine, VaccinationRecord


class VaccineSerializer(serializers.ModelSerializer):
    """
    Serializer for Vaccine model.
    """
    type_display = serializers.CharField(source='get_vaccine_type_display', read_only=True)

    class Meta:
        model = Vaccine
        fields = [
            'id', 'vaccine_id', 'name', 'vaccine_type', 'type_display',
            'min_start_age_weeks', 'rules_json', 'is_active'
        ]
        read_only_fields = ['id']


class VaccineListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for vaccine listing.
    """
    type_display = serializers.CharField(source='get_vaccine_type_display', read_only=True)

    class Meta:
        model = Vaccine
        fields = ['id', 'vaccine_id', 'name', 'vaccine_type', 'type_display', 'is_active']


class VaccinationRecordSerializer(serializers.ModelSerializer):
    """
    Serializer for VaccinationRecord model.
    """
    vaccine_name = serializers.CharField(source='vaccine.name', read_only=True)
    vaccine_id = serializers.CharField(source='vaccine.vaccine_id', read_only=True)

    class Meta:
        model = VaccinationRecord
        fields = [
            'id', 'vaccine', 'vaccine_id', 'vaccine_name',
            'date_administered', 'dose_number', 'notes', 'administered_by',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class VaccinationRecordCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating vaccination records.
    Accepts vaccine_id string instead of vaccine FK.
    """
    vaccine_id = serializers.CharField(write_only=True)

    class Meta:
        model = VaccinationRecord
        fields = [
            'vaccine_id', 'date_administered', 'dose_number',
            'notes', 'administered_by'
        ]

    def validate_vaccine_id(self, value: str) -> Vaccine:
        """Convert vaccine_id string to Vaccine instance."""
        try:
            return Vaccine.objects.get(vaccine_id=value, is_active=True)
        except Vaccine.DoesNotExist:
            raise serializers.ValidationError(f"Vaccine '{value}' not found.")

    def validate_date_administered(self, value: datetime.date) -> datetime.date:
        """Ensure date is not in the future."""
        if value > datetime.date.today():
            raise serializers.ValidationError("Date administered cannot be in the future.")
        return value

    def create(self, validated_data: dict) -> VaccinationRecord:
        """Create vaccination record with vaccine FK."""
        vaccine = validated_data.pop('vaccine_id')
        validated_data['vaccine'] = vaccine
        return super().create(validated_data)


class ScheduleRequestSerializer(serializers.Serializer):
    """
    Serializer for schedule calculation request.
    """
    selected_noncore = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
        help_text="List of non-core vaccine IDs to include"
    )
    reference_date = serializers.DateField(
        required=False,
        help_text="Date to calculate schedule from (default: today)"
    )


class ScheduleItemSerializer(serializers.Serializer):
    """
    Serializer for a single schedule item.
    """
    vaccine = serializers.CharField()
    dose = serializers.CharField()
    date = serializers.CharField()
    notes = serializers.CharField()
    days_overdue = serializers.IntegerField(required=False)
    days_until = serializers.IntegerField(required=False)


class ScheduleResponseSerializer(serializers.Serializer):
    """
    Serializer for schedule calculation response.
    """
    dog = serializers.DictField()
    schedule = serializers.DictField()
    history_analysis = serializers.CharField()
    generated_at = serializers.DateTimeField()
