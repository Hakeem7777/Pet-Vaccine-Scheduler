import datetime
import logging
import os

import csv
import io

from django.contrib.auth import get_user_model
from django.db.models import Count, Max, Min, Sum
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek
from django.http import StreamingHttpResponse
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import serializers as drf_serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.generics import DestroyAPIView, ListAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

from apps.patients.models import Dog
from apps.vaccinations.models import VaccinationRecord
from .filters import (
    AdminContactFilter,
    AdminDogFilter,
    AdminTokenUsageFilter,
    AdminUserFilter,
    AdminVaccinationFilter,
)
from .models import ContactSubmission, LeadCapture, ReminderPreference, TokenUsage
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


class LeadCaptureView(APIView):
    """Capture guest user email for lead generation. No auth required."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        source = request.data.get('source', 'guest_schedule')
        if not email or '@' not in email:
            return Response(
                {'error': 'A valid email is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        LeadCapture.objects.create(email=email, source=source)
        return Response({'status': 'ok'}, status=status.HTTP_201_CREATED)


# ── Admin Views ───────────────────────────────────────────────────

class AdminStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        recent_users = User.objects.annotate(
            _dog_count=Count('dogs', distinct=True),
            _vaccination_count=Count('dogs__vaccination_records', distinct=True),
            _total_tokens_used=Sum('token_usages__total_tokens'),
            _ai_call_count=Count('token_usages', distinct=True),
        ).order_by('-date_joined')[:5]

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
    ordering_fields = ['date_joined', 'email', 'username', 'total_tokens_used']
    ordering = ['-date_joined']

    def get_queryset(self):
        return User.objects.annotate(
            _dog_count=Count('dogs', distinct=True),
            _vaccination_count=Count('dogs__vaccination_records', distinct=True),
            _total_tokens_used=Sum('token_usages__total_tokens'),
            _ai_call_count=Count('token_usages', distinct=True),
        )


class AdminUserToggleActiveView(APIView):
    """Toggle a user's is_active status (block/unblock)."""
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if request.user == user:
            raise PermissionDenied("Cannot block/unblock yourself.")
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        return Response({
            'id': user.id,
            'is_active': user.is_active,
            'detail': f"User {'unblocked' if user.is_active else 'blocked'} successfully.",
        })


class AdminUserDeleteView(DestroyAPIView):
    permission_classes = [IsAdminUser]
    queryset = User.objects.all()

    def perform_destroy(self, instance):
        if self.request.user == instance:
            raise PermissionDenied("Cannot delete yourself.")
        if instance.is_active:
            raise PermissionDenied("User must be blocked before deletion.")
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
        except (ConnectionError, TimeoutError, OSError) as e:
            logger.exception("Failed to send contact reply")
            return Response(
                {'error': 'Failed to send reply. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminUserExportCSVView(ListAPIView):
    """Export filtered user data as CSV."""
    permission_classes = [IsAdminUser]
    serializer_class = AdminUserSerializer
    filter_backends = [SearchFilter, DjangoFilterBackend, OrderingFilter]
    search_fields = ['email', 'username', 'clinic_name']
    filterset_class = AdminUserFilter
    ordering_fields = ['date_joined', 'email', 'username']
    ordering = ['-date_joined']
    pagination_class = None  # Return all results for CSV

    def get_queryset(self):
        return User.objects.annotate(
            _dog_count=Count('dogs', distinct=True),
            _vaccination_count=Count('dogs__vaccination_records', distinct=True),
            _total_tokens_used=Sum('token_usages__total_tokens'),
            _ai_call_count=Count('token_usages', distinct=True),
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        csv_headers = [
            'ID', 'Username', 'Email', 'First Name', 'Last Name',
            'Clinic Name', 'Phone', 'Staff', 'Active', 'Date Joined',
            'Dog Count', 'Vaccination Count', 'Total Tokens Used', 'AI Calls',
        ]

        def csv_rows():
            buffer = io.StringIO()
            writer = csv.writer(buffer)
            writer.writerow(csv_headers)
            yield buffer.getvalue()
            buffer.seek(0)
            buffer.truncate(0)

            for user in queryset.iterator():
                from apps.vaccinations.models import VaccinationRecord as VR
                writer.writerow([
                    user.id,
                    user.username,
                    user.email,
                    user.first_name,
                    user.last_name,
                    user.clinic_name or '',
                    user.phone or '',
                    'Yes' if user.is_staff else 'No',
                    'Yes' if user.is_active else 'No',
                    user.date_joined.strftime('%Y-%m-%d'),
                    user.dogs.count(),
                    VR.objects.filter(dog__owner=user).count(),
                    getattr(user, '_total_tokens_used', 0) or 0,
                    getattr(user, '_ai_call_count', 0) or 0,
                ])
                yield buffer.getvalue()
                buffer.seek(0)
                buffer.truncate(0)

        response = StreamingHttpResponse(csv_rows(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="users_export.csv"'
        return response


# ── Graph Data ────────────────────────────────────────────────────

RANGE_PRESETS = {
    '7d': datetime.timedelta(days=7),
    '30d': datetime.timedelta(days=30),
    '90d': datetime.timedelta(days=90),
    '6m': datetime.timedelta(days=182),
    '12m': datetime.timedelta(days=365),
}

GRANULARITY_MAP = {
    'day': TruncDate,
    'week': TruncWeek,
    'month': TruncMonth,
}


def _pick_trunc(qs, date_field):
    """Pick aggregation granularity based on the date span of the queryset.

    Returns (TruncFunction, granularity_label) where granularity_label
    is one of 'day', 'week', or 'month'.
    """
    bounds = qs.aggregate(d_min=Min(date_field), d_max=Max(date_field))
    d_min, d_max = bounds['d_min'], bounds['d_max']
    if d_min is None or d_max is None:
        return TruncDate, 'day'
    if hasattr(d_min, 'date'):
        d_min = d_min.date()
    if hasattr(d_max, 'date'):
        d_max = d_max.date()
    span = (d_max - d_min).days
    if span > 90:
        return TruncMonth, 'month'
    if span > 14:
        return TruncWeek, 'week'
    return TruncDate, 'day'


def _parse_range(request):
    """Parse date range from query params. Returns (date_from, date_to).

    Supports two modes:
    1. Preset: ?range=7d|30d|90d|6m|12m|all  (backward compatible)
    2. Explicit: ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD  (for navigation)

    Explicit params take precedence when provided.
    date_to of None means "up to now".
    """
    explicit_from = request.query_params.get('date_from')
    explicit_to = request.query_params.get('date_to')

    if explicit_from:
        date_from = timezone.make_aware(
            datetime.datetime.strptime(explicit_from, '%Y-%m-%d')
        )
        date_to = None
        if explicit_to:
            date_to = timezone.make_aware(
                datetime.datetime.strptime(explicit_to, '%Y-%m-%d')
            ) + datetime.timedelta(days=1)  # inclusive end
        return date_from, date_to

    preset = request.query_params.get('range', '12m')
    if preset == 'all':
        return None, None
    delta = RANGE_PRESETS.get(preset, RANGE_PRESETS['12m'])
    return timezone.now() - delta, None


def _resolve_granularity(request, qs, date_field):
    """If ?granularity= is explicit, use it; otherwise auto-detect."""
    gran = request.query_params.get('granularity', 'auto')
    if gran in GRANULARITY_MAP:
        return GRANULARITY_MAP[gran], gran
    return _pick_trunc(qs, date_field)


class AdminGraphDataView(APIView):
    """Returns aggregated data for admin dashboard charts.

    Accepts optional ?chart= param to return only a specific chart's data.
    Valid values: user_registrations, vaccinations_over_time,
    vaccine_type_distribution, top_breeds, age_distribution.
    When omitted, returns all chart data (backward compatible).
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        date_from, date_to = _parse_range(request)
        chart = request.query_params.get('chart')
        result = {}

        # 1. User registrations over time (time-filtered, adaptive)
        if chart is None or chart == 'user_registrations':
            users_qs = User.objects.all()
            if date_from:
                users_qs = users_qs.filter(date_joined__gte=date_from)
            if date_to:
                users_qs = users_qs.filter(date_joined__lt=date_to)
            trunc_fn, reg_granularity = _resolve_granularity(request, users_qs, 'date_joined')
            result['user_registrations'] = list(
                users_qs
                .annotate(date=trunc_fn('date_joined'))
                .values('date')
                .annotate(count=Count('id'))
                .order_by('date')
            )
            result['user_registrations_granularity'] = reg_granularity

        # 2. Vaccinations over time (time-filtered, adaptive)
        if chart is None or chart == 'vaccinations_over_time':
            vax_qs = VaccinationRecord.objects.all()
            if date_from:
                date_from_date = date_from.date() if hasattr(date_from, 'date') else date_from
                vax_qs = vax_qs.filter(date_administered__gte=date_from_date)
            if date_to:
                date_to_date = date_to.date() if hasattr(date_to, 'date') else date_to
                vax_qs = vax_qs.filter(date_administered__lt=date_to_date)
            trunc_fn, vax_granularity = _resolve_granularity(request, vax_qs, 'date_administered')
            result['vaccinations_over_time'] = list(
                vax_qs
                .annotate(date=trunc_fn('date_administered'))
                .values('date')
                .annotate(count=Count('id'))
                .order_by('date')
            )
            result['vaccinations_granularity'] = vax_granularity

        # 3. Vaccine type distribution (time-filtered)
        if chart is None or chart == 'vaccine_type_distribution':
            vax_type_qs = VaccinationRecord.objects.all()
            if date_from:
                date_from_date = date_from.date() if hasattr(date_from, 'date') else date_from
                vax_type_qs = vax_type_qs.filter(date_administered__gte=date_from_date)
            if date_to:
                date_to_date = date_to.date() if hasattr(date_to, 'date') else date_to
                vax_type_qs = vax_type_qs.filter(date_administered__lt=date_to_date)
            result['vaccine_type_distribution'] = list(
                vax_type_qs
                .values('vaccine__vaccine_type')
                .annotate(count=Count('id'))
                .order_by('-count')
            )

        # 4. Top 10 breeds (optionally date-filtered by Dog.created_at)
        if chart is None or chart == 'top_breeds':
            breeds_qs = Dog.objects.exclude(breed='')
            if date_from:
                breeds_qs = breeds_qs.filter(created_at__gte=date_from)
            if date_to:
                breeds_qs = breeds_qs.filter(created_at__lt=date_to)
            result['top_breeds'] = list(
                breeds_qs
                .values('breed')
                .annotate(count=Count('id'))
                .order_by('-count')[:10]
            )

        # 5. Dog age distribution (optionally date-filtered by Dog.created_at)
        if chart is None or chart == 'age_distribution':
            today = datetime.date.today()
            dogs_qs = Dog.objects.all()
            if date_from:
                dogs_qs = dogs_qs.filter(created_at__gte=date_from)
            if date_to:
                dogs_qs = dogs_qs.filter(created_at__lt=date_to)
            dogs_birth_dates = dogs_qs.values_list('birth_date', flat=True)
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
            result['age_distribution'] = [
                {'classification': k, 'count': v}
                for k, v in age_counts.items()
            ]

        return Response(result)


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
    """Aggregated token usage statistics for charts.

    Accepts optional ?chart= param to return only a specific chart's data.
    Valid values: over_time, per_user, per_model_over_time.
    When omitted, returns all data (backward compatible).
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        date_from, date_to = _parse_range(request)
        chart = request.query_params.get('chart')

        base_qs = TokenUsage.objects.all()
        if date_from:
            base_qs = base_qs.filter(created_at__gte=date_from)
        if date_to:
            base_qs = base_qs.filter(created_at__lt=date_to)

        result = {}

        # Per-user totals (top 10)
        if chart is None or chart == 'per_user':
            result['per_user'] = list(
                base_qs.values('user__email')
                .annotate(
                    total_input=Sum('input_tokens'),
                    total_output=Sum('output_tokens'),
                    total_tokens=Sum('total_tokens'),
                    call_count=Count('id'),
                )
                .order_by('-total_tokens')[:10]
            )

        # Per-endpoint totals (only in bulk mode)
        if chart is None:
            result['per_endpoint'] = list(
                base_qs.values('endpoint')
                .annotate(
                    total_tokens=Sum('total_tokens'),
                    call_count=Count('id'),
                )
                .order_by('-total_tokens')
            )

        # Pick granularity for token time-series
        trunc_fn, token_granularity = _resolve_granularity(
            request, base_qs, 'created_at',
        )

        # Usage over time (adaptive)
        if chart is None or chart == 'over_time':
            result['over_time'] = list(
                base_qs
                .annotate(date=trunc_fn('created_at'))
                .values('date')
                .annotate(
                    total_tokens=Sum('total_tokens'),
                    total_input=Sum('input_tokens'),
                    total_output=Sum('output_tokens'),
                    call_count=Count('id'),
                )
                .order_by('date')
            )
            result['token_granularity'] = token_granularity

        # Per-model over time (adaptive)
        if chart is None or chart == 'per_model_over_time':
            result['per_model_over_time'] = list(
                base_qs
                .exclude(model_name='')
                .annotate(date=trunc_fn('created_at'))
                .values('date', 'model_name')
                .annotate(
                    input_tokens=Sum('input_tokens'),
                    output_tokens=Sum('output_tokens'),
                )
                .order_by('date', 'model_name')
            )
            if 'token_granularity' not in result:
                result['token_granularity'] = token_granularity

        # Grand totals (only in bulk mode)
        if chart is None:
            result['totals'] = TokenUsage.objects.aggregate(
                total_input=Sum('input_tokens'),
                total_output=Sum('output_tokens'),
                total_tokens=Sum('total_tokens'),
                total_calls=Count('id'),
            )

        return Response(result)


# ── AI Analytics ──────────────────────────────────────────────────

class AdminAIAnalyticsView(APIView):
    """Natural language database query interface for admins."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        message = (request.data.get('message') or '').strip()
        if not message:
            return Response(
                {'detail': 'Message is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(message) > 1000:
            message = message[:1000]

        conversation_history = request.data.get('conversation_history', [])
        if not isinstance(conversation_history, list):
            conversation_history = []

        model = (request.data.get('model') or '').strip() or None

        from .ai_analytics import run_ai_analytics
        try:
            result = run_ai_analytics(message, conversation_history, model=model)
        except (ValueError, ConnectionError, OSError) as e:
            logger.exception("AI Analytics error")
            return Response({
                'summary': 'Sorry, something went wrong while processing your question. Please try again.',
                'data': None,
                'visualization': 'number',
                'chart_config': {},
                'error': True,
            })

        # Log token usage
        token_info = result.get('token_info', {})
        if token_info.get('input_tokens') or token_info.get('output_tokens'):
            from .token_tracking import log_token_usage
            log_token_usage(
                user=request.user,
                endpoint='ai_analytics',
                usage_data={
                    'input_tokens': token_info.get('input_tokens', 0),
                    'output_tokens': token_info.get('output_tokens', 0),
                    'total_tokens': token_info.get('input_tokens', 0) + token_info.get('output_tokens', 0),
                    'model_name': token_info.get('model_name', ''),
                },
            )

        return Response({
            'summary': result.get('summary', ''),
            'data': result.get('data'),
            'visualization': result.get('visualization', 'table'),
            'chart_config': result.get('chart_config', {}),
            'error': result.get('error', False),
        })


class AdminAIModelsView(APIView):
    """Return available AI models for the analytics selector."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from .ai_analytics import AVAILABLE_MODELS, ANALYTICS_MODEL
        return Response({
            'models': AVAILABLE_MODELS,
            'default': ANALYTICS_MODEL,
        })
