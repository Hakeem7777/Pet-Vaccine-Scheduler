"""
Serializers for AI analysis endpoints.
"""
import os
from rest_framework import serializers


class AIQuerySerializer(serializers.Serializer):
    """
    Serializer for general AI query requests.
    """
    query = serializers.CharField(
        max_length=1000,
        help_text="The question to ask about vaccination"
    )


class AISourceSerializer(serializers.Serializer):
    """
    Serializer for source document information.
    """
    document = serializers.CharField()
    excerpt = serializers.CharField()


class AIResponseSerializer(serializers.Serializer):
    """
    Serializer for AI query response.
    """
    answer = serializers.CharField()
    sources = AISourceSerializer(many=True)


class DogAIAnalysisSerializer(serializers.Serializer):
    """
    Serializer for dog-specific AI analysis request.
    """
    include_schedule = serializers.BooleanField(
        default=True,
        help_text="Include current schedule in the analysis"
    )
    selected_noncore = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
        help_text="List of non-core vaccine IDs to consider"
    )
    custom_query = serializers.CharField(
        required=False,
        max_length=500,
        help_text="Optional custom question about this dog's vaccinations"
    )


class ChatMessageSerializer(serializers.Serializer):
    """
    Serializer for individual chat message.
    """
    role = serializers.ChoiceField(choices=['user', 'assistant'])
    content = serializers.CharField(max_length=2000)


class ChatRequestSerializer(serializers.Serializer):
    """
    Serializer for chat endpoint request.
    """
    message = serializers.CharField(
        max_length=1000,
        help_text="The user's message"
    )
    dog_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Optional single dog ID for context (use dog_ids for multi-dog)"
    )
    dog_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_null=True,
        default=None,
        help_text="Optional list of dog IDs for multi-dog context"
    )
    conversation_history = ChatMessageSerializer(
        many=True,
        required=False,
        default=list,
        help_text="Previous messages in the conversation"
    )


class ChatResponseSerializer(serializers.Serializer):
    """
    Serializer for chat endpoint response.
    """
    response = serializers.CharField()
    sources = AISourceSerializer(many=True)
    dog_context = serializers.DictField(
        required=False,
        allow_null=True,
        help_text="Dog information if dog_id was provided"
    )


# ============================================
# Document Upload and Extraction Serializers
# ============================================

class DocumentUploadSerializer(serializers.Serializer):
    """Serializer for document upload request."""
    document = serializers.FileField(
        help_text="Document file (image or PDF)"
    )

    def validate_document(self, value):
        """Validate uploaded file."""
        # Check file size (10MB max)
        max_size = 10 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File size exceeds maximum of 10MB. Got {value.size / 1024 / 1024:.1f}MB"
            )

        # Check file extension
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.pdf', '.gif', '.webp']
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in allowed_extensions:
            raise serializers.ValidationError(
                f"File type '{ext}' not supported. Allowed: {', '.join(allowed_extensions)}"
            )

        return value


class ExtractedDogInfoSerializer(serializers.Serializer):
    """Serializer for extracted dog basic info."""
    name = serializers.CharField(allow_null=True, required=False)
    breed = serializers.CharField(allow_null=True, required=False)
    birth_date = serializers.DateField(allow_null=True, required=False)
    weight_kg = serializers.DecimalField(
        max_digits=5, decimal_places=2, allow_null=True, required=False
    )
    sex = serializers.ChoiceField(
        choices=['M', 'F', 'MN', 'FS'], allow_null=True, required=False
    )


class ExtractedLifestyleSerializer(serializers.Serializer):
    """Serializer for extracted lifestyle info."""
    env_indoor_only = serializers.BooleanField(allow_null=True, required=False)
    env_dog_parks = serializers.BooleanField(allow_null=True, required=False)
    env_daycare_boarding = serializers.BooleanField(allow_null=True, required=False)
    env_travel_shows = serializers.BooleanField(allow_null=True, required=False)


class ExtractedVaccinationSerializer(serializers.Serializer):
    """Serializer for a single extracted vaccination record."""
    vaccine_name = serializers.CharField()
    date_administered = serializers.DateField(allow_null=True, required=False)
    dose_number = serializers.IntegerField(allow_null=True, required=False)
    administered_by = serializers.CharField(allow_null=True, required=False)
    notes = serializers.CharField(allow_null=True, required=False)


class ExtractionConfidenceSerializer(serializers.Serializer):
    """Serializer for extraction confidence info."""
    overall = serializers.ChoiceField(choices=['high', 'medium', 'low'])
    notes = serializers.CharField(allow_blank=True, required=False)


class DocumentExtractionResponseSerializer(serializers.Serializer):
    """Serializer for document extraction response."""
    dog_info = ExtractedDogInfoSerializer(required=False, allow_null=True)
    lifestyle = ExtractedLifestyleSerializer(required=False, allow_null=True)
    vaccinations = ExtractedVaccinationSerializer(many=True, required=False)
    confidence = ExtractionConfidenceSerializer()


class ApplyExtractionSerializer(serializers.Serializer):
    """Serializer for applying extracted data to a dog."""
    dog_info = ExtractedDogInfoSerializer(required=False)
    lifestyle = ExtractedLifestyleSerializer(required=False)
    vaccinations = ExtractedVaccinationSerializer(many=True, required=False)
