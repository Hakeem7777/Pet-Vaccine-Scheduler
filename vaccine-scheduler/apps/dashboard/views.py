import os

from django.contrib.auth import get_user_model
from rest_framework import serializers as drf_serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import SearchFilter
from rest_framework.generics import DestroyAPIView, ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.patients.models import Dog
from apps.vaccinations.models import VaccinationRecord
from .models import ContactSubmission
from .permissions import IsAdminUser
from .serializers import (
    AdminDogSerializer,
    AdminUserSerializer,
    AdminVaccinationRecordSerializer,
    ContactSubmissionSerializer,
    DashboardDogSummarySerializer,
    DashboardRecentVaccinationSerializer,
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


# ── Admin Views ───────────────────────────────────────────────────

class AdminStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        recent_users = User.objects.order_by('-date_joined')[:5]
        return Response({
            'total_users': User.objects.count(),
            'total_dogs': Dog.objects.count(),
            'total_vaccinations': VaccinationRecord.objects.count(),
            'total_contacts': ContactSubmission.objects.count(),
            'recent_registrations': AdminUserSerializer(recent_users, many=True).data,
        })


class AdminUserListView(ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminUserSerializer
    filter_backends = [SearchFilter]
    search_fields = ['email', 'username', 'clinic_name']

    def get_queryset(self):
        return User.objects.all().order_by('-date_joined')


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
    filter_backends = [SearchFilter]
    search_fields = ['name', 'breed', 'owner__email']

    def get_queryset(self):
        return Dog.objects.all().select_related('owner').order_by('-created_at')


class AdminDogDeleteView(DestroyAPIView):
    permission_classes = [IsAdminUser]
    queryset = Dog.objects.all()


class AdminVaccinationListView(ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminVaccinationRecordSerializer
    filter_backends = [SearchFilter]
    search_fields = ['dog__name', 'vaccine__name', 'dog__owner__email']

    def get_queryset(self):
        return (
            VaccinationRecord.objects.all()
            .select_related('dog', 'dog__owner', 'vaccine')
            .order_by('-date_administered')
        )


class AdminContactListView(ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = ContactSubmissionSerializer

    def get_queryset(self):
        return ContactSubmission.objects.all().order_by('-created_at')


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
