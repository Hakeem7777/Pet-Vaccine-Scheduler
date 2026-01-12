"""
Views for vaccination management and schedule calculation.
"""
import datetime
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.patients.models import Dog
from .models import Vaccine, VaccinationRecord
from .serializers import (
    VaccineSerializer,
    VaccineListSerializer,
    VaccinationRecordSerializer,
    VaccinationRecordCreateSerializer,
    ScheduleRequestSerializer,
)
from .services import scheduler_service


class VaccineViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for listing and retrieving vaccines.

    Endpoints:
    - GET /api/vaccines/ - List all active vaccines
    - GET /api/vaccines/{id}/ - Get vaccine details with rules
    """
    permission_classes = [IsAuthenticated]
    queryset = Vaccine.objects.filter(is_active=True)

    def get_serializer_class(self):
        if self.action == 'list':
            return VaccineListSerializer
        return VaccineSerializer


class VaccinationRecordViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing vaccination records for a specific dog.

    Endpoints:
    - GET /api/dogs/{dog_id}/vaccinations/ - List dog's vaccination history
    - POST /api/dogs/{dog_id}/vaccinations/ - Add vaccination record
    - GET /api/dogs/{dog_id}/vaccinations/{id}/ - Get specific record
    - PUT /api/dogs/{dog_id}/vaccinations/{id}/ - Update record
    - DELETE /api/dogs/{dog_id}/vaccinations/{id}/ - Delete record
    """
    permission_classes = [IsAuthenticated]

    def get_dog(self) -> Dog:
        """Get the dog and verify ownership."""
        dog_id = self.kwargs.get('dog_id')
        return get_object_or_404(
            Dog.objects.filter(owner=self.request.user),
            pk=dog_id
        )

    def get_queryset(self):
        """Filter vaccination records to the specific dog."""
        dog = self.get_dog()
        return VaccinationRecord.objects.filter(dog=dog).select_related('vaccine')

    def get_serializer_class(self):
        if self.action == 'create':
            return VaccinationRecordCreateSerializer
        return VaccinationRecordSerializer

    def perform_create(self, serializer):
        """Associate the record with the dog."""
        dog = self.get_dog()
        serializer.save(dog=dog)

    def create(self, request, *args, **kwargs):
        """Create vaccination record and return full details."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        # Return the created record with full details
        output_serializer = VaccinationRecordSerializer(serializer.instance)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class ScheduleView(APIView):
    """
    Calculate vaccine schedule for a dog.

    POST /api/dogs/{dog_id}/schedule/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, dog_id: int):
        """
        Calculate vaccine schedule for the specified dog.

        Request body:
        {
            "selected_noncore": ["noncore_lyme", "noncore_bord_in"],
            "reference_date": "2025-12-08"  // Optional
        }

        Response:
        {
            "dog": {...},
            "schedule": {
                "overdue": [...],
                "upcoming": [...],
                "future": [...]
            },
            "history_analysis": "...",
            "generated_at": "2025-12-08T10:30:00Z"
        }
        """
        # Verify dog ownership
        dog = get_object_or_404(
            Dog.objects.filter(owner=request.user),
            pk=dog_id
        )

        # Validate request
        serializer = ScheduleRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        selected_noncore = serializer.validated_data.get('selected_noncore', [])
        reference_date = serializer.validated_data.get('reference_date') or datetime.date.today()

        # Calculate schedule
        schedule = scheduler_service.calculate_schedule_for_dog(
            dog=dog,
            selected_noncore=selected_noncore,
            reference_date=reference_date
        )

        # Analyze history
        history_analysis = scheduler_service.analyze_history(dog)

        # Build response
        response_data = {
            'dog': {
                'id': dog.id,
                'name': dog.name,
                'breed': dog.breed,
                'birth_date': dog.birth_date.isoformat(),
                'age_weeks': dog.age_weeks,
                'age_classification': scheduler_service.get_age_classification(dog, reference_date),
            },
            'schedule': schedule,
            'history_analysis': history_analysis,
            'generated_at': timezone.now().isoformat(),
        }

        return Response(response_data, status=status.HTTP_200_OK)


class HistoryAnalysisView(APIView):
    """
    Analyze vaccination history for a dog.

    GET /api/dogs/{dog_id}/schedule/history-analysis/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, dog_id: int):
        """
        Analyze vaccination history for timing issues.

        Response:
        {
            "dog_id": 1,
            "dog_name": "Buddy",
            "analysis": "History appears consistent...",
            "vaccination_count": 5
        }
        """
        dog = get_object_or_404(
            Dog.objects.filter(owner=request.user),
            pk=dog_id
        )

        analysis = scheduler_service.analyze_history(dog)

        return Response({
            'dog_id': dog.id,
            'dog_name': dog.name,
            'analysis': analysis,
            'vaccination_count': dog.vaccination_records.count(),
        }, status=status.HTTP_200_OK)
