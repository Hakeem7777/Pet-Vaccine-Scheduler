import datetime
import os

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import serializers as drf_serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.generics import DestroyAPIView, ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.patients.models import Dog
from apps.vaccinations.models import VaccinationRecord
from .filters import (
    AdminContactFilter,
    AdminDogFilter,
    AdminTokenUsageFilter,
    AdminUserFilter,
    AdminVaccinationFilter,
)
from .models import ContactSubmission, ReminderPreference, TokenUsage
from .permissions import IsAdminUser
from .serializers import (
    AdminDogSerializer,
    AdminUserSerializer,
    AdminVaccinationRecordSerializer,
    ContactSubmissionSerializer,
    DashboardDogSummarySerializer,
    DashboardRecentVaccinationSerializer,
    ReminderPreferenceSerializer,
    TokenUsageSerializer,
)

User = get_user_model()


# ── Client Dashboard ──────────────────────────────────────────────

class ClientDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        dogs = Dog.objects.filter(owner=user).prefetch_related('vaccination_records')
        recent_vaccinations = (
            VaccinationRecord.objects
            .filter(dog__owner=user)
            .select_related('dog', 'vaccine')
            .order_by('-date_administered')[:5]
        )

        return Response({
            'dog_count': dogs.count(),
            'vaccination_count': VaccinationRecord.objects.filter(dog__owner=user).count(),
            'dogs_summary': DashboardDogSummarySerializer(dogs, many=True).data,
            'recent_vaccinations': DashboardRecentVaccinationSerializer(recent_vaccinations, many=True).data,
        })


class ReminderPreferenceView(APIView):
    """GET/PUT reminder preferences for the authenticated user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pref, _created = ReminderPreference.objects.get_or_create(user=request.user)
        serializer = ReminderPreferenceSerializer(pref)
        return Response(serializer.data)

    def put(self, request):
        pref, _created = ReminderPreference.objects.get_or_create(user=request.user)
        serializer = ReminderPreferenceSerializer(pref, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ── Admin Views ───────────────────────────────────────────────────

class AdminStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        recent_users = User.objects.order_by('-date_joined')[:5]

        token_totals = TokenUsage.objects.aggregate(
            total_input=Sum('input_tokens'),
            total_output=Sum('output_tokens'),
            total_tokens=Sum('total_tokens'),
            total_calls=Count('id'),
        )

        return Response({
            'total_users': User.objects.count(),
            'total_dogs': Dog.objects.count(),
            'total_vaccinations': VaccinationRecord.objects.count(),
            'total_contacts': ContactSubmission.objects.count(),
            'total_ai_tokens': token_totals['total_tokens'] or 0,
            'total_ai_calls': token_totals['total_calls'] or 0,
            'recent_registrations': AdminUserSerializer(recent_users, many=True).data,
        })


class AdminUserListView(ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminUserSerializer
    filter_backends = [SearchFilter, DjangoFilterBackend, OrderingFilter]
    search_fields = ['email', 'username', 'clinic_name']
    filterset_class = AdminUserFilter
    ordering_fields = ['date_joined', 'email', 'username']
    ordering = ['-date_joined']

    def get_queryset(self):
        return User.objects.all()


class AdminUserDeleteView(DestroyAPIView):
    permission_classes = [IsAdminUser]
    queryset = User.objects.all()

    def perform_destroy(self, instance):
        if self.request.user == instance:
            raise PermissionDenied("Cannot delete yourself.")
        instance.delete()


class AdminDogListView(ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminDogSerializer
    filter_backends = [SearchFilter, DjangoFilterBackend, OrderingFilter]
    search_fields = ['name', 'breed', 'owner__email']
    filterset_class = AdminDogFilter
    ordering_fields = ['created_at', 'name', 'birth_date']
    ordering = ['-created_at']

    def get_queryset(self):
        return Dog.objects.all().select_related('owner')


class AdminDogDeleteView(DestroyAPIView):
    permission_classes = [IsAdminUser]
    queryset = Dog.objects.all()


class AdminVaccinationListView(ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminVaccinationRecordSerializer
    filter_backends = [SearchFilter, DjangoFilterBackend, OrderingFilter]
    search_fields = ['dog__name', 'vaccine__name', 'dog__owner__email']
    filterset_class = AdminVaccinationFilter
    ordering_fields = ['date_administered', 'created_at']
    ordering = ['-date_administered']

    def get_queryset(self):
        return (
            VaccinationRecord.objects.all()
            .select_related('dog', 'dog__owner', 'vaccine')
        )


class AdminContactListView(ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = ContactSubmissionSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = AdminContactFilter
    ordering_fields = ['created_at', 'is_read']
    ordering = ['-created_at']

    def get_queryset(self):
        return ContactSubmission.objects.all()


class AdminContactReplyView(APIView):
    permission_classes = [IsAdminUser]

    class InputSerializer(drf_serializers.Serializer):
        reply_message = drf_serializers.CharField(min_length=1)

    def post(self, request, pk):
        try:
            contact = ContactSubmission.objects.get(pk=pk)
        except ContactSubmission.DoesNotExist:
            return Response(
                {'detail': 'Contact submission not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.InputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if not os.environ.get('RESEND_API_KEY'):
            return Response(
                {'error': 'Email service is not configured.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        from apps.email_service.services import EmailService
        try:
            email_service = EmailService()
            result = email_service.send_contact_reply(
                to_email=contact.email,
                name=contact.name,
                original_subject=contact.subject,
                reply_message=serializer.validated_data['reply_message'],
            )

            if result['success']:
                contact.is_read = True
                contact.save(update_fields=['is_read'])
                return Response({'message': 'Reply sent successfully.'})
            else:
                return Response(
                    {'error': result['message']},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to send reply: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ── Graph Data ────────────────────────────────────────────────────

class AdminGraphDataView(APIView):
    """Returns aggregated data for admin dashboard charts."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        twelve_months_ago = now - datetime.timedelta(days=365)

        # 1. User registrations over time (last 12 months)
        user_registrations = list(
            User.objects
            .filter(date_joined__gte=twelve_months_ago)
            .annotate(month=TruncMonth('date_joined'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )

        # 2. Vaccinations over time (last 12 months)
        vaccinations_over_time = list(
            VaccinationRecord.objects
            .filter(date_administered__gte=twelve_months_ago.date())
            .annotate(month=TruncMonth('date_administered'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )

        # 3. Vaccine type distribution
        vaccine_type_distribution = list(
            VaccinationRecord.objects
            .values('vaccine__vaccine_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # 4. Top 10 breeds
        top_breeds = list(
            Dog.objects
            .exclude(breed='')
            .values('breed')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        # 5. Dog age distribution
        today = datetime.date.today()
        dogs_birth_dates = Dog.objects.values_list('birth_date', flat=True)
        age_counts = {'puppy': 0, 'adolescent': 0, 'adult': 0, 'senior': 0}
        for bd in dogs_birth_dates:
            weeks = (today - bd).days // 7
            if weeks <= 16:
                age_counts['puppy'] += 1
            elif weeks <= 52:
                age_counts['adolescent'] += 1
            elif weeks <= 7 * 52:
                age_counts['adult'] += 1
            else:
                age_counts['senior'] += 1

        age_distribution = [
            {'classification': k, 'count': v}
            for k, v in age_counts.items()
        ]

        return Response({
            'user_registrations': user_registrations,
            'vaccinations_over_time': vaccinations_over_time,
            'vaccine_type_distribution': vaccine_type_distribution,
            'top_breeds': top_breeds,
            'age_distribution': age_distribution,
        })


# ── Token Usage ───────────────────────────────────────────────────

class AdminTokenUsageListView(ListAPIView):
    """Paginated list of all token usage records."""
    permission_classes = [IsAdminUser]
    serializer_class = TokenUsageSerializer
    filter_backends = [SearchFilter, DjangoFilterBackend, OrderingFilter]
    search_fields = ['user__email', 'endpoint', 'model_name']
    filterset_class = AdminTokenUsageFilter
    ordering_fields = ['created_at', 'total_tokens', 'input_tokens', 'output_tokens']
    ordering = ['-created_at']

    def get_queryset(self):
        return TokenUsage.objects.all().select_related('user')


class AdminTokenUsageStatsView(APIView):
    """Aggregated token usage statistics for charts."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        # Per-user totals (top 10)
        per_user = list(
            TokenUsage.objects.values('user__email')
            .annotate(
                total_input=Sum('input_tokens'),
                total_output=Sum('output_tokens'),
                total_tokens=Sum('total_tokens'),
                call_count=Count('id'),
            )
            .order_by('-total_tokens')[:10]
        )

        # Per-endpoint totals
        per_endpoint = list(
            TokenUsage.objects.values('endpoint')
            .annotate(
                total_tokens=Sum('total_tokens'),
                call_count=Count('id'),
            )
            .order_by('-total_tokens')
        )

        # Usage over time (by month)
        over_time = list(
            TokenUsage.objects
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(
                total_tokens=Sum('total_tokens'),
                total_input=Sum('input_tokens'),
                total_output=Sum('output_tokens'),
                call_count=Count('id'),
            )
            .order_by('month')
        )

        # Grand totals
        totals = TokenUsage.objects.aggregate(
            total_input=Sum('input_tokens'),
            total_output=Sum('output_tokens'),
            total_tokens=Sum('total_tokens'),
            total_calls=Count('id'),
        )

        return Response({
            'totals': totals,
            'per_user': per_user,
            'per_endpoint': per_endpoint,
            'over_time': over_time,
        })
