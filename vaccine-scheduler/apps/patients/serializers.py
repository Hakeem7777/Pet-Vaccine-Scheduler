"""
Serializers for patient (dog) management.
"""
from rest_framework import serializers

from .models import Dog


class DogSerializer(serializers.ModelSerializer):
    """
    Serializer for Dog model with computed fields.
    """
    sex_display = serializers.CharField(source='get_sex_display', read_only=True)
    age_weeks = serializers.IntegerField(read_only=True)
    age_classification = serializers.CharField(read_only=True)
    vaccination_count = serializers.SerializerMethodField()

    class Meta:
        model = Dog
        fields = [
            'id', 'name', 'breed', 'sex', 'sex_display', 'birth_date',
            'weight_kg', 'age_weeks', 'age_classification',
            'env_indoor_only', 'env_dog_parks', 'env_daycare_boarding',
            'env_travel_shows', 'env_tick_exposure', 'vaccination_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_vaccination_count(self, obj: Dog) -> int:
        """Get the number of vaccination records for this dog."""
        return obj.vaccination_records.count()


class DogCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new dog.
    """
    class Meta:
        model = Dog
        fields = [
            'name', 'breed', 'sex', 'birth_date', 'weight_kg',
            'env_indoor_only', 'env_dog_parks', 'env_daycare_boarding',
            'env_travel_shows', 'env_tick_exposure'
        ]
        extra_kwargs = {
            'breed': {'required': False, 'allow_blank': True},
            'sex': {'required': False},
            'weight_kg': {'required': False},
        }

    def validate_birth_date(self, value):
        """Ensure birth date is not in the future."""
        import datetime
        if value > datetime.date.today():
            raise serializers.ValidationError("Birth date cannot be in the future.")
        return value


class DogDetailSerializer(DogSerializer):
    """
    Detailed serializer for a single dog, including recent vaccinations.
    """
    recent_vaccinations = serializers.SerializerMethodField()

    class Meta(DogSerializer.Meta):
        fields = DogSerializer.Meta.fields + ['recent_vaccinations']

    def get_recent_vaccinations(self, obj: Dog) -> list:
        """Get the 5 most recent vaccination records."""
        from apps.vaccinations.serializers import VaccinationRecordSerializer
        records = obj.vaccination_records.select_related('vaccine').order_by('-date_administered')[:5]
        return VaccinationRecordSerializer(records, many=True).data
