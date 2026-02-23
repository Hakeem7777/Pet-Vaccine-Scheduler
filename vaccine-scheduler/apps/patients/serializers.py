"""
Serializers for patient (dog) management.
"""
from rest_framework import serializers

from core.contraindications import VALID_CONDITIONS, MEDICATION_CATALOG
from .models import Dog


class DogSerializer(serializers.ModelSerializer):
    """
    Serializer for Dog model with computed fields.
    """
    sex_display = serializers.CharField(source='get_sex_display', read_only=True)
    age_weeks = serializers.IntegerField(read_only=True)
    age_classification = serializers.CharField(read_only=True)
    vaccination_count = serializers.SerializerMethodField()
    vaccination_summary = serializers.SerializerMethodField()

    class Meta:
        model = Dog
        fields = [
            'id', 'name', 'breed', 'sex', 'sex_display', 'birth_date',
            'weight_kg', 'image', 'age_weeks', 'age_classification',
            'env_indoor_only', 'env_dog_parks', 'env_daycare_boarding',
            'env_travel_shows', 'env_tick_exposure',
            'health_vaccine_reaction', 'health_prescription_meds',
            'health_chronic_condition', 'health_immune_condition',
            'health_immunosuppressive_meds', 'health_pregnant_breeding',
            'medical_conditions', 'medications',
            'vaccination_count', 'vaccination_summary',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_vaccination_count(self, obj: Dog) -> int:
        """Get the number of vaccination records for this dog."""
        return obj.vaccination_records.count()

    def get_vaccination_summary(self, obj: Dog) -> dict:
        """Get vaccination progress and overdue/upcoming summary."""
        import datetime
        from apps.vaccinations.services import scheduler_service

        today = datetime.date.today()
        try:
            schedule = scheduler_service.calculate_schedule_for_dog(
                dog=obj, selected_noncore=[], reference_date=today
            )
        except Exception:
            return {'progress_percent': 0, 'overdue': [], 'next_upcoming': None}

        completed = obj.vaccination_records.count()
        total_remaining = (
            len(schedule['overdue'])
            + len(schedule['upcoming'])
            + len(schedule['future'])
        )
        total = completed + total_remaining
        progress = round(completed / total * 100) if total > 0 else 100

        overdue_list = [
            {
                'vaccine': item['vaccine'],
                'vaccine_id': item['vaccine_id'],
                'due_date': item['date'],
                'days_overdue': item['days_overdue'],
            }
            for item in schedule['overdue'][:2]
        ]

        next_upcoming = None
        if schedule['upcoming']:
            u = schedule['upcoming'][0]
            next_upcoming = {
                'vaccine': u['vaccine'],
                'due_date': u['date'],
                'days_until': u['days_until'],
            }

        return {
            'progress_percent': progress,
            'overdue': overdue_list,
            'next_upcoming': next_upcoming,
        }


class DogCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new dog.
    """
    class Meta:
        model = Dog
        fields = [
            'name', 'breed', 'sex', 'birth_date', 'weight_kg', 'image',
            'env_indoor_only', 'env_dog_parks', 'env_daycare_boarding',
            'env_travel_shows', 'env_tick_exposure',
            'health_vaccine_reaction', 'health_prescription_meds',
            'health_chronic_condition', 'health_immune_condition',
            'health_immunosuppressive_meds', 'health_pregnant_breeding',
            'medical_conditions', 'medications',
        ]
        extra_kwargs = {
            'breed': {'required': False, 'allow_blank': True},
            'sex': {'required': False},
            'weight_kg': {'required': False},
            'image': {'required': False},
            'health_vaccine_reaction': {'required': False},
            'health_prescription_meds': {'required': False},
            'health_chronic_condition': {'required': False},
            'health_immune_condition': {'required': False},
            'health_immunosuppressive_meds': {'required': False},
            'health_pregnant_breeding': {'required': False},
            'medical_conditions': {'required': False},
            'medications': {'required': False},
        }

    def validate_image(self, value):
        """Validate image file size and type."""
        if value:
            max_size = 100 * 1024 * 1024  # 100MB
            if value.size > max_size:
                raise serializers.ValidationError("Image file size cannot exceed 100MB.")
            allowed_types = ['image/jpeg', 'image/png']
            if hasattr(value, 'content_type') and value.content_type not in allowed_types:
                raise serializers.ValidationError("Only PNG and JPG images are allowed.")
        return value

    def to_internal_value(self, data):
        """Handle JSON string fields from FormData submissions."""
        import json
        if hasattr(data, 'getlist'):  # QueryDict from FormData
            # Convert to plain dict to avoid deepcopy which fails on file
            # upload objects (_io.BufferedRandom can't be pickled)
            mutable = {}
            for key in data:
                values = data.getlist(key)
                mutable[key] = values[0] if len(values) == 1 else values
            for field in ('medical_conditions', 'medications'):
                if field in mutable and isinstance(mutable[field], str):
                    try:
                        mutable[field] = json.loads(mutable[field])
                    except (json.JSONDecodeError, TypeError):
                        pass
            data = mutable
        return super().to_internal_value(data)

    def validate_birth_date(self, value):
        """Ensure birth date is not in the future."""
        import datetime
        if value > datetime.date.today():
            raise serializers.ValidationError("Birth date cannot be in the future.")
        return value

    def validate_medical_conditions(self, value):
        """Validate medical conditions are from the allowed set."""
        if not isinstance(value, list):
            raise serializers.ValidationError("Must be a list of condition identifiers.")
        for cond in value:
            if cond not in VALID_CONDITIONS:
                raise serializers.ValidationError(
                    f"Unknown condition: '{cond}'. Valid: {', '.join(sorted(VALID_CONDITIONS))}"
                )
        return value

    def validate_medications(self, value):
        """Validate medications structure is a dict of category -> list."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Must be a dict of category -> [medication_ids].")
        valid_categories = set(MEDICATION_CATALOG.keys())
        for cat_key, med_list in value.items():
            if cat_key not in valid_categories:
                raise serializers.ValidationError(
                    f"Unknown medication category: '{cat_key}'. "
                    f"Valid: {', '.join(sorted(valid_categories))}"
                )
            if not isinstance(med_list, list):
                raise serializers.ValidationError(
                    f"Medications for '{cat_key}' must be a list."
                )
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
