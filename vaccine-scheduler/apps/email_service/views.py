"""
Views for email service.
"""
import os
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .serializers import SendScheduleEmailSerializer
from .services import EmailService


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
        except Exception as e:
            return Response(
                {'error': f'Failed to send email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
