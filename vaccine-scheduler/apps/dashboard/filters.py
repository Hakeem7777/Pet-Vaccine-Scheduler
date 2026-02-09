import django_filters
from django.contrib.auth import get_user_model

from apps.patients.models import Dog
from apps.vaccinations.models import VaccinationRecord
from .models import ContactSubmission, TokenUsage

User = get_user_model()


class AdminUserFilter(django_filters.FilterSet):
    is_staff = django_filters.BooleanFilter()
    is_active = django_filters.BooleanFilter()
    date_joined_after = django_filters.DateTimeFilter(
        field_name='date_joined', lookup_expr='gte',
    )
    date_joined_before = django_filters.DateTimeFilter(
        field_name='date_joined', lookup_expr='lte',
    )

    class Meta:
        model = User
        fields = ['is_staff', 'is_active']


class AdminDogFilter(django_filters.FilterSet):
    sex = django_filters.ChoiceFilter(choices=[
        ('M', 'Male'), ('F', 'Female'),
        ('MN', 'Male (Neutered)'), ('FS', 'Female (Spayed)'),
    ])
    breed = django_filters.CharFilter(lookup_expr='icontains')
    created_after = django_filters.DateTimeFilter(
        field_name='created_at', lookup_expr='gte',
    )
    created_before = django_filters.DateTimeFilter(
        field_name='created_at', lookup_expr='lte',
    )

    class Meta:
        model = Dog
        fields = ['sex', 'breed']


class AdminVaccinationFilter(django_filters.FilterSet):
    vaccine_type = django_filters.ChoiceFilter(
        field_name='vaccine__vaccine_type',
        choices=[
            ('core', 'Core'),
            ('core_conditional', 'Core Conditional'),
            ('noncore', 'Non-Core'),
        ],
    )
    date_after = django_filters.DateFilter(
        field_name='date_administered', lookup_expr='gte',
    )
    date_before = django_filters.DateFilter(
        field_name='date_administered', lookup_expr='lte',
    )

    class Meta:
        model = VaccinationRecord
        fields = ['vaccine_type']


class AdminContactFilter(django_filters.FilterSet):
    is_read = django_filters.BooleanFilter()

    class Meta:
        model = ContactSubmission
        fields = ['is_read']


class AdminTokenUsageFilter(django_filters.FilterSet):
    endpoint = django_filters.CharFilter()
    model_name = django_filters.CharFilter()

    class Meta:
        model = TokenUsage
        fields = ['endpoint', 'model_name']
