"""
Serializers for email service.
"""
from rest_framework import serializers


class SendScheduleEmailSerializer(serializers.Serializer):
    """Serializer for send schedule email request."""

    emails = serializers.ListField(
        child=serializers.EmailField(),
        min_length=1,
        max_length=10,
        help_text="List of email addresses to send to (max 10)"
    )
    dogName = serializers.CharField(
        max_length=100,
        help_text="Name of the dog"
    )
    dogInfo = serializers.DictField(
        required=False,
        default=dict,
        help_text="Dog information (breed, age_weeks, birth_date, etc.)"
    )
    schedule = serializers.DictField(
        required=False,
        default=dict,
        help_text="Schedule with overdue, upcoming, future arrays"
    )
    historyAnalysis = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        help_text="AI analysis of vaccination history"
    )

    def validate(self, data):
        """Transform camelCase to snake_case for backend use."""
        return {
            'emails': data['emails'],
            'dog_name': data['dogName'],
            'dog_info': data.get('dogInfo', {}),
            'schedule': data.get('schedule', {}),
            'history_analysis': data.get('historyAnalysis'),
        }
