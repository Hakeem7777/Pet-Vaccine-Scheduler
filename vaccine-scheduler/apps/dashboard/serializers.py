from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.patients.models import Dog
from apps.vaccinations.models import VaccinationRecord
from .models import ContactSubmission

User = get_user_model()


class AdminUserSerializer(serializers.ModelSerializer):
    dog_count = serializers.SerializerMethodField()
    vaccination_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'clinic_name', 'phone', 'is_staff', 'is_active',
            'date_joined', 'dog_count', 'vaccination_count',
        ]

    def get_dog_count(self, obj):
        return obj.dogs.count()

    def get_vaccination_count(self, obj):
        return VaccinationRecord.objects.filter(dog__owner=obj).count()


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
