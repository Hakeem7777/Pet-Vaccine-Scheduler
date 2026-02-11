"""
Views for email service.
"""
import logging
import os

from rest_framework import status
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .serializers import SendScheduleEmailSerializer, ContactFormSerializer
from .services import EmailService

logger = logging.getLogger(__name__)


class ContactFormThrottle(AnonRateThrottle):
    """Strict rate limit for contact form submissions."""
    scope = 'contact'


class SendScheduleEmailView(APIView):
    """
    Send vaccination schedule via email.

    POST /api/email/send-schedule/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Send vaccination schedule email with PDF and ICS attachments.

        Request body:
        {
            "emails": ["email1@example.com", "email2@example.com"],
            "dogName": "Buddy",
            "dogInfo": {
                "breed": "Golden Retriever",
                "age_weeks": 52,
                "age_classification": "adult",
                "birth_date": "2023-12-01"
            },
            "schedule": {
                "overdue": [...],
                "upcoming": [...],
                "future": [...]
            },
            "historyAnalysis": "Optional analysis text"
        }
        """
        # Check if Resend is configured
        if not os.environ.get('RESEND_API_KEY'):
            return Response(
                {'error': 'Email service is not configured. Please set RESEND_API_KEY.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        serializer = SendScheduleEmailSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid request data', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data

        try:
            email_service = EmailService()
            result = email_service.send_schedule_email(
                to_emails=data['emails'],
                dog_name=data['dog_name'],
                dog_info=data.get('dog_info', {}),
                schedule=data.get('schedule', {}),
                history_analysis=data.get('history_analysis')
            )

            if result['success']:
                return Response({
                    'message': result['message'],
                    'recipients': len(data['emails'])
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': result['message']
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except (ConnectionError, TimeoutError, OSError) as e:
            logger.exception("Failed to send schedule email")
            return Response(
                {'error': 'Failed to send email. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ContactFormView(APIView):
    """
    Handle contact form submissions.

    POST /api/email/contact/
    """
    permission_classes = []  # Public endpoint - no authentication required
    throttle_classes = [ContactFormThrottle]

    def post(self, request):
        """
        Process contact form submission.
        - Validates input
        - Sends confirmation email to user
        - Sends notification email to admin
        """
        # Check if Resend is configured
        if not os.environ.get('RESEND_API_KEY'):
            return Response(
                {'error': 'Email service is not configured. Please set RESEND_API_KEY.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        serializer = ContactFormSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data

        # Save contact submission to database
        from apps.dashboard.models import ContactSubmission
        ContactSubmission.objects.create(
            name=data['name'],
            email=data['email'],
            subject=data['subject'],
            message=data['message'],
        )

        try:
            email_service = EmailService()

            # Send confirmation email to user
            confirmation_result = email_service.send_contact_confirmation(
                to_email=data['email'],
                name=data['name'],
                subject=data['subject']
            )

            # Send notification email to admin
            notification_result = email_service.send_contact_notification(
                name=data['name'],
                email=data['email'],
                subject=data['subject'],
                message=data['message']
            )

            if confirmation_result['success']:
                return Response({
                    'message': 'Your message has been sent successfully. We will respond as soon as possible.'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'Failed to send confirmation email. Please try again.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except (ConnectionError, TimeoutError, OSError) as e:
            logger.exception("Failed to process contact form")
            return Response(
                {'error': 'Failed to process contact form. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
