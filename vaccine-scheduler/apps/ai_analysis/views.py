"""
Views for AI-powered analysis endpoints.
"""
import logging
import datetime
from typing import Optional, Dict
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.patients.models import Dog
from apps.vaccinations.models import Vaccine, VaccinationRecord
from apps.vaccinations.services import scheduler_service
from .serializers import (
    AIQuerySerializer,
    DogAIAnalysisSerializer,
    ChatRequestSerializer,
    DocumentUploadSerializer,
    DocumentExtractionResponseSerializer,
    ApplyExtractionSerializer,
)
from .services import rag_service
from .document_extraction import document_extraction_service
from .throttles import AIRateThrottle
from core.llm_providers import get_llm
from core.prompt_sanitizer import sanitize_prompt_input
from apps.dashboard.token_tracking import log_token_usage

logger = logging.getLogger(__name__)


class VaccineMatcherAI:
    """
    AI-powered vaccine name matcher that uses LLM to match
    extracted vaccine names to database vaccines.
    """
    _instance = None
    _cache: Dict[str, Optional[str]] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def match_vaccine(self, extracted_name: str, user=None) -> Optional[Vaccine]:
        """
        Use AI to match an extracted vaccine name to a database vaccine.
        Returns the matched Vaccine object or None if no match.
        """
        extracted_name = sanitize_prompt_input(extracted_name, max_length=200)
        if not extracted_name:
            return None

        # Check cache first
        cache_key = extracted_name.lower().strip()
        if cache_key in self._cache:
            cached_id = self._cache[cache_key]
            if cached_id is None:
                return None
            try:
                return Vaccine.objects.get(vaccine_id=cached_id, is_active=True)
            except Vaccine.DoesNotExist:
                return None

        # Get all available vaccines from database
        vaccines = list(Vaccine.objects.filter(is_active=True).values('vaccine_id', 'name'))

        if not vaccines:
            logger.warning("No vaccines found in database")
            return None

        # Build the prompt for the LLM
        vaccine_list = "\n".join([f"- {v['vaccine_id']}: {v['name']}" for v in vaccines])

        prompt = f"""You are a veterinary vaccine expert. Match the extracted vaccine name to one of the known vaccines.

Extracted vaccine name from document: "{extracted_name}"

Available vaccines in our database:
{vaccine_list}

IMPORTANT MATCHING RULES:
- DAP, DHPP, DA2PP, DHLPP, Distemper, Parvo, Parvovirus, Adenovirus all refer to the core DAP combination vaccine
- Lepto, Leptospirosis refer to the Leptospirosis vaccine
- Bordetella, Kennel Cough refer to Bordetella vaccines (check if intranasal/oral or injection is specified)
- Lyme, Borrelia refer to the Lyme vaccine
- CIV, Canine Influenza, Dog Flu, H3N8, H3N2 refer to Canine Influenza vaccine

Respond with ONLY the vaccine_id that best matches, or "NONE" if no match is found.
Do not include any explanation, just the vaccine_id or NONE."""

        try:
            llm = get_llm(temperature=0)
            response = llm.invoke(prompt)
            if user:
                log_token_usage(user, 'vaccine_match', response)
            matched_id = response.content.strip().upper()

            if matched_id == "NONE":
                self._cache[cache_key] = None
                logger.info(f"AI could not match vaccine: {extracted_name}")
                return None

            # Clean up the response (remove any extra text)
            matched_id = matched_id.lower().strip()

            # Verify the vaccine exists
            try:
                vaccine = Vaccine.objects.get(vaccine_id=matched_id, is_active=True)
                self._cache[cache_key] = matched_id
                logger.info(f"AI matched '{extracted_name}' -> {vaccine.name} ({matched_id})")
                return vaccine
            except Vaccine.DoesNotExist:
                # Try partial match on vaccine_id
                for v in vaccines:
                    if matched_id in v['vaccine_id'].lower() or v['vaccine_id'].lower() in matched_id:
                        try:
                            vaccine = Vaccine.objects.get(vaccine_id=v['vaccine_id'], is_active=True)
                            self._cache[cache_key] = v['vaccine_id']
                            logger.info(f"AI matched '{extracted_name}' -> {vaccine.name} (partial: {v['vaccine_id']})")
                            return vaccine
                        except Vaccine.DoesNotExist:
                            continue

                self._cache[cache_key] = None
                logger.warning(f"AI returned invalid vaccine_id: {matched_id} for '{extracted_name}'")
                return None

        except (ValueError, ConnectionError, KeyError) as e:
            logger.error(f"AI vaccine matching failed for '{extracted_name}': {e}")
            return None


# Global singleton instance
vaccine_matcher_ai = VaccineMatcherAI()


class AIStatusView(APIView):
    """
    Check the status of the AI/RAG service.

    GET /api/ai/status/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return the current status of the RAG service."""
        return Response(rag_service.get_status(), status=status.HTTP_200_OK)


class AIQueryView(APIView):
    """
    General AI query endpoint for vaccination-related questions.

    POST /api/ai/query/
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [AIRateThrottle]

    def post(self, request):
        """
        Answer a general question about vaccinations.

        Request body:
        {
            "query": "Why is the 2-4 week interval important for puppy vaccinations?"
        }

        Response:
        {
            "answer": "The 2-4 week interval...",
            "sources": [
                {
                    "document": "AAHA_Guidelines.pdf",
                    "excerpt": "..."
                }
            ]
        }
        """
        serializer = AIQuerySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not rag_service.is_available():
            return Response({
                'error': 'AI service is not available',
                'status': rag_service.get_status()
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            query = sanitize_prompt_input(serializer.validated_data['query'], max_length=500)
            result = rag_service.query(query)
            if result.get('token_usage'):
                log_token_usage(request.user, 'ai_query', result['token_usage'])
            return Response({
                'answer': result['answer'],
                'sources': result['sources'],
            }, status=status.HTTP_200_OK)
        except (ValueError, ConnectionError, OSError) as e:
            logger.exception("AI query failed")
            return Response({
                'error': 'AI query failed. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DogAIAnalysisView(APIView):
    """
    Dog-specific AI analysis endpoint.

    POST /api/dogs/{dog_id}/ai-analysis/
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [AIRateThrottle]

    def post(self, request, dog_id: int):
        """
        Generate AI analysis for a specific dog's vaccination needs.

        Request body:
        {
            "include_schedule": true,
            "selected_noncore": ["noncore_lyme"],
            "custom_query": "Should this puppy get the Lyme vaccine?"
        }

        Response:
        {
            "dog": {...},
            "analysis": "Based on the guidelines...",
            "sources": [...],
            "schedule_summary": {...}
        }
        """
        # Verify dog ownership
        dog = get_object_or_404(
            Dog.objects.filter(owner=request.user),
            pk=dog_id
        )

        serializer = DogAIAnalysisSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not rag_service.is_available():
            return Response({
                'error': 'AI service is not available',
                'status': rag_service.get_status()
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Build context about the dog
        include_schedule = serializer.validated_data.get('include_schedule', True)
        selected_noncore = serializer.validated_data.get('selected_noncore', [])
        custom_query = sanitize_prompt_input(
            serializer.validated_data.get('custom_query', ''), max_length=500
        )

        # Get dog info
        age_classification = scheduler_service.get_age_classification(dog)

        # Build the query
        context_parts = [
            f"I have a {dog.age_weeks} week old {age_classification} dog",
            f"(breed: {dog.breed or 'unknown'}).",
        ]

        # Add environment info if relevant
        env_factors = []
        if dog.env_dog_parks:
            env_factors.append("visits dog parks")
        if dog.env_daycare_boarding:
            env_factors.append("attends daycare/boarding")
        if dog.env_travel_shows:
            env_factors.append("travels or participates in shows")
        if dog.env_indoor_only:
            env_factors.append("lives primarily indoors")

        if env_factors:
            context_parts.append(f"The dog {', '.join(env_factors)}.")

        # Add schedule info if requested
        schedule_summary = None
        if include_schedule:
            schedule = scheduler_service.calculate_schedule_for_dog(
                dog=dog,
                selected_noncore=selected_noncore,
                reference_date=datetime.date.today()
            )
            schedule_summary = {
                'overdue_count': len(schedule['overdue']),
                'upcoming_count': len(schedule['upcoming']),
                'future_count': len(schedule['future']),
            }

            if schedule['overdue']:
                overdue_vaccines = [item['vaccine'] for item in schedule['overdue']]
                context_parts.append(f"Overdue vaccines: {', '.join(overdue_vaccines)}.")

            if schedule['upcoming']:
                upcoming_vaccines = [item['vaccine'] for item in schedule['upcoming']]
                context_parts.append(f"Upcoming vaccines (next 30 days): {', '.join(upcoming_vaccines)}.")

        # Add custom query or default
        if custom_query:
            context_parts.append(f"Question: {custom_query}")
        else:
            context_parts.append(
                "Based on veterinary vaccination guidelines, "
                "what are the most important considerations for this dog's vaccination schedule?"
            )

        query = " ".join(context_parts)

        try:
            result = rag_service.query(query)
            if result.get('token_usage'):
                log_token_usage(request.user, 'dog_ai_analysis', result['token_usage'])

            response_data = {
                'dog': {
                    'id': dog.id,
                    'name': dog.name,
                    'breed': dog.breed,
                    'age_weeks': dog.age_weeks,
                    'age_classification': age_classification,
                },
                'analysis': result['answer'],
                'sources': result['sources'],
            }

            if schedule_summary:
                response_data['schedule_summary'] = schedule_summary

            return Response(response_data, status=status.HTTP_200_OK)

        except (ValueError, ConnectionError, OSError) as e:
            logger.exception("AI analysis failed")
            return Response({
                'error': 'AI analysis failed. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AIChatView(APIView):
    """
    Conversational chat endpoint with optional single or multi-dog context.

    POST /api/ai/chat/
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [AIRateThrottle]

    # Maximum dogs to include in context to avoid token limits
    MAX_DOGS_IN_CONTEXT = 10

    def post(self, request):
        """
        Handle a chat message with optional single or multi-dog context.

        Request body:
        {
            "message": "What vaccines does my puppy need?",
            "dog_id": 123,  // optional - single dog context
            "dog_ids": [1, 2, 3],  // optional - multi-dog context (takes precedence)
            "conversation_history": [
                {"role": "user", "content": "..."},
                {"role": "assistant", "content": "..."}
            ]
        }

        Response:
        {
            "response": "Based on the guidelines...",
            "sources": [...],
            "dog_context": {...}  // if dog_id or dog_ids provided
        }
        """
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = sanitize_prompt_input(serializer.validated_data['message'], max_length=1000)
        dog_id = serializer.validated_data.get('dog_id')
        dog_ids = serializer.validated_data.get('dog_ids')
        history = serializer.validated_data.get('conversation_history', [])
        selected_noncore = serializer.validated_data.get('selected_noncore', [])

        if not rag_service.is_available():
            return Response({
                'error': 'AI service is not available',
                'status': rag_service.get_status()
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Build context parts
        context_parts = []
        dog_context = None

        # Handle multi-dog context (dog_ids takes precedence over dog_id)
        if dog_ids and len(dog_ids) > 0:
            dogs = Dog.objects.filter(
                owner=request.user,
                pk__in=dog_ids[:self.MAX_DOGS_IN_CONTEXT]
            ).prefetch_related('vaccination_records__vaccine')

            if dogs.exists():
                dog_context = self._build_multi_dog_context(dogs)
                context_parts.append(self._format_multi_dog_context(dogs, selected_noncore))

        # Fall back to single dog_id for backward compatibility
        elif dog_id:
            try:
                dog = Dog.objects.filter(owner=request.user).prefetch_related(
                    'vaccination_records__vaccine'
                ).get(pk=dog_id)
                dog_context = self._build_dog_context(dog)
                context_parts.append(self._format_dog_context(dog, selected_noncore))
            except Dog.DoesNotExist:
                pass

        # Build conversation context from history
        if history:
            history_text = self._format_conversation_history(history)
            context_parts.append(history_text)

        # Build the full query
        if context_parts:
            full_query = "\n\n".join(context_parts) + f"\n\nCurrent question: {message}"
        else:
            full_query = message

        try:
            result = rag_service.query(full_query)
            if result.get('token_usage'):
                log_token_usage(request.user, 'ai_chat', result['token_usage'])

            return Response({
                'response': result['answer'],
                'sources': result['sources'],
                'dog_context': dog_context
            }, status=status.HTTP_200_OK)

        except (ValueError, ConnectionError, OSError) as e:
            logger.exception("AI chat failed")
            return Response({
                'error': 'Chat failed. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _build_dog_context(self, dog):
        """Build a dictionary with dog information."""
        age_classification = scheduler_service.get_age_classification(dog)

        return {
            'id': dog.id,
            'name': dog.name,
            'breed': dog.breed,
            'age_weeks': dog.age_weeks,
            'age_classification': age_classification,
            'weight_kg': str(dog.weight_kg) if dog.weight_kg else None,
            'sex': dog.sex,
            'environment': {
                'indoor_only': dog.env_indoor_only,
                'dog_parks': dog.env_dog_parks,
                'daycare_boarding': dog.env_daycare_boarding,
                'travel_shows': dog.env_travel_shows,
            }
        }

    def _format_dog_context(self, dog, selected_noncore=None):
        """Format dog information as a context string for the AI."""
        age_classification = scheduler_service.get_age_classification(dog)

        parts = [
            f"Dog Information:",
            f"- Name: {dog.name}",
            f"- Age: {dog.age_weeks} weeks ({age_classification})",
            f"- Breed: {dog.breed or 'unknown'}",
        ]

        if dog.weight_kg:
            parts.append(f"- Weight: {dog.weight_kg} kg")

        # Environment factors
        env_factors = []
        if dog.env_indoor_only:
            env_factors.append("lives primarily indoors")
        if dog.env_dog_parks:
            env_factors.append("visits dog parks")
        if dog.env_daycare_boarding:
            env_factors.append("attends daycare/boarding")
        if dog.env_travel_shows:
            env_factors.append("travels or participates in shows")
        if dog.env_tick_exposure:
            env_factors.append("frequents tick-prone areas")

        if env_factors:
            parts.append(f"- Environment: {', '.join(env_factors)}")

        # Vaccination history
        records = dog.vaccination_records.select_related('vaccine').order_by('-date_administered')[:5]
        if records:
            parts.append("- Recent vaccinations:")
            for record in records:
                parts.append(f"  * {record.vaccine.name} on {record.date_administered}")

        # Get schedule info
        try:
            schedule = scheduler_service.calculate_schedule_for_dog(
                dog=dog,
                selected_noncore=selected_noncore or [],
                reference_date=datetime.date.today()
            )

            if schedule['overdue']:
                overdue_vaccines = [item['vaccine'] for item in schedule['overdue']]
                parts.append(f"- Overdue vaccines: {', '.join(overdue_vaccines)}")

            if schedule['upcoming']:
                upcoming_vaccines = [item['vaccine'] for item in schedule['upcoming']]
                parts.append(f"- Upcoming vaccines (next 30 days): {', '.join(upcoming_vaccines)}")
        except (ValueError, KeyError) as e:
            logger.debug(f"Could not include schedule in context: {e}")

        return "\n".join(parts)

    def _format_conversation_history(self, history):
        """Format conversation history as context."""
        if not history:
            return ""

        parts = ["Previous conversation:"]
        for msg in history[-4:]:  # Keep last 4 messages to reduce token usage
            role = "User" if msg['role'] == 'user' else "Assistant"
            parts.append(f"{role}: {msg['content']}")

        return "\n".join(parts)

    def _build_multi_dog_context(self, dogs):
        """Build a dictionary with information for multiple dogs."""
        return {
            'mode': 'multi_dog',
            'count': len(dogs),
            'dogs': [self._build_dog_context(dog) for dog in dogs]
        }

    def _format_multi_dog_context(self, dogs, selected_noncore=None):
        """Format multiple dogs' information as context string for AI."""
        parts = [
            f"User's Dogs Summary ({len(dogs)} dogs total):",
            "=" * 40
        ]

        for i, dog in enumerate(dogs, 1):
            age_classification = scheduler_service.get_age_classification(dog)
            dog_parts = [
                f"\n{i}. {dog.name}:",
                f"   - Age: {dog.age_weeks} weeks ({age_classification})",
                f"   - Breed: {dog.breed or 'unknown'}",
            ]

            if dog.weight_kg:
                dog_parts.append(f"   - Weight: {dog.weight_kg} kg")

            # Environment factors
            env_factors = []
            if dog.env_indoor_only:
                env_factors.append("indoors")
            if dog.env_dog_parks:
                env_factors.append("dog parks")
            if dog.env_daycare_boarding:
                env_factors.append("daycare/boarding")
            if dog.env_travel_shows:
                env_factors.append("travel/shows")
            if dog.env_tick_exposure:
                env_factors.append("tick exposure area")

            if env_factors:
                dog_parts.append(f"   - Environment: {', '.join(env_factors)}")

            # Get schedule info
            try:
                schedule = scheduler_service.calculate_schedule_for_dog(
                    dog=dog,
                    selected_noncore=selected_noncore or [],
                    reference_date=datetime.date.today()
                )

                if schedule['overdue']:
                    overdue_vaccines = [item['vaccine'] for item in schedule['overdue']]
                    dog_parts.append(f"   - OVERDUE vaccines: {', '.join(overdue_vaccines)}")

                if schedule['upcoming']:
                    upcoming_vaccines = [item['vaccine'] for item in schedule['upcoming']]
                    dog_parts.append(f"   - Upcoming (next 30 days): {', '.join(upcoming_vaccines)}")

            except (ValueError, KeyError) as e:
                logger.debug(f"Could not include schedule for dog {dog.id}: {e}")

            # Recent vaccinations (limit to 3 per dog in multi-dog mode)
            records = dog.vaccination_records.select_related('vaccine').order_by('-date_administered')[:3]
            if records:
                dog_parts.append("   - Recent vaccinations:")
                for record in records:
                    dog_parts.append(f"     * {record.vaccine.name} on {record.date_administered}")

            parts.extend(dog_parts)

        return "\n".join(parts)


class DocumentExtractView(APIView):
    """
    Extract dog information from an uploaded document.

    POST /api/dogs/{dog_id}/extract-document/
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [AIRateThrottle]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, dog_id: int):
        """
        Process uploaded document and extract dog information.

        Request: multipart/form-data with 'document' file field

        Response:
        {
            "dog_info": {...},
            "lifestyle": {...},
            "vaccinations": [...],
            "confidence": {...},
            "warnings": [...]  # Validation warnings
        }
        """
        # Verify dog ownership
        dog = get_object_or_404(
            Dog.objects.filter(owner=request.user),
            pk=dog_id
        )

        # Validate upload
        serializer = DocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uploaded_file = serializer.validated_data['document']

        try:
            # Read file data
            file_data = uploaded_file.read()

            # Extract information using AI
            extraction_result = document_extraction_service.extract_from_bytes(
                file_data,
                uploaded_file.name
            )

            # Log token usage
            token_usage = extraction_result.pop('_token_usage', None)
            if token_usage:
                log_token_usage(request.user, 'document_extract', token_usage)

            # Validate extracted data against current dog info
            warnings = self._validate_extraction(extraction_result, dog)

            # Validate and serialize response
            response_serializer = DocumentExtractionResponseSerializer(
                data=extraction_result
            )

            if response_serializer.is_valid():
                response_data = response_serializer.data
                response_data['warnings'] = warnings
                response_data['current_dog'] = {
                    'name': dog.name,
                    'breed': dog.breed,
                    'birth_date': str(dog.birth_date) if dog.birth_date else None,
                    'weight_kg': str(dog.weight_kg) if dog.weight_kg else None,
                }
                return Response(response_data, status=status.HTTP_200_OK)
            else:
                # Return raw result with validation errors
                return Response({
                    'extraction': extraction_result,
                    'validation_errors': response_serializer.errors,
                    'warnings': warnings,
                    'confidence': extraction_result.get('confidence', {
                        'overall': 'low',
                        'notes': 'Validation errors occurred'
                    })
                }, status=status.HTTP_200_OK)

        except (ValueError, ConnectionError, IOError) as e:
            logger.exception("Document extraction failed")
            return Response({
                'error': 'Document extraction failed. Please try again.',
                'confidence': {'overall': 'low', 'notes': 'Processing error occurred'}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _validate_extraction(self, extraction_result: dict, dog: Dog) -> list:
        """
        Validate extracted data against current dog info to detect inconsistencies.
        Returns a list of warning messages.
        """
        warnings = []
        dog_birth_date = dog.birth_date

        # Check vaccination dates against dog's birth date
        vaccinations = extraction_result.get('vaccinations', [])
        for vax in vaccinations:
            vax_date_str = vax.get('date_administered')
            if vax_date_str and dog_birth_date:
                try:
                    if isinstance(vax_date_str, str):
                        vax_date = datetime.datetime.strptime(vax_date_str, '%Y-%m-%d').date()
                    else:
                        vax_date = vax_date_str

                    if vax_date < dog_birth_date:
                        warnings.append({
                            'type': 'date_before_birth',
                            'severity': 'error',
                            'message': f"Vaccination '{vax.get('vaccine_name', 'Unknown')}' dated {vax_date} is BEFORE the dog's birth date ({dog_birth_date}). This document may be for a different dog.",
                            'field': 'vaccination',
                            'vaccine_name': vax.get('vaccine_name'),
                            'date': str(vax_date),
                        })
                except (ValueError, TypeError):
                    pass

        # Check if extracted birth date differs significantly from current
        extracted_dog_info = extraction_result.get('dog_info', {})
        extracted_birth_date = extracted_dog_info.get('birth_date')
        if extracted_birth_date and dog_birth_date:
            try:
                if isinstance(extracted_birth_date, str):
                    ext_date = datetime.datetime.strptime(extracted_birth_date, '%Y-%m-%d').date()
                else:
                    ext_date = extracted_birth_date

                days_diff = abs((ext_date - dog_birth_date).days)
                if days_diff > 30:  # More than 30 days difference
                    warnings.append({
                        'type': 'birth_date_mismatch',
                        'severity': 'warning',
                        'message': f"Extracted birth date ({ext_date}) differs from current dog's birth date ({dog_birth_date}) by {days_diff} days. Please verify this document is for the correct dog.",
                        'field': 'birth_date',
                    })
            except (ValueError, TypeError):
                pass

        # Check if extracted name differs from current dog
        extracted_name = extracted_dog_info.get('name')
        if extracted_name and dog.name:
            if extracted_name.lower().strip() != dog.name.lower().strip():
                warnings.append({
                    'type': 'name_mismatch',
                    'severity': 'warning',
                    'message': f"Extracted name '{extracted_name}' differs from current dog's name '{dog.name}'. This document may be for a different dog.",
                    'field': 'name',
                })

        # Check for unreasonable weight based on breed (basic check)
        extracted_weight = extracted_dog_info.get('weight_kg')
        if extracted_weight:
            try:
                weight = float(extracted_weight)
                # Flag extremely unusual weights
                if weight > 100:
                    warnings.append({
                        'type': 'weight_unusual',
                        'severity': 'warning',
                        'message': f"Extracted weight ({weight} kg) seems unusually high for a dog. Please verify.",
                        'field': 'weight_kg',
                    })
                elif weight < 0.5:
                    warnings.append({
                        'type': 'weight_unusual',
                        'severity': 'warning',
                        'message': f"Extracted weight ({weight} kg) seems unusually low for a dog. Please verify.",
                        'field': 'weight_kg',
                    })
            except (ValueError, TypeError):
                pass

        # Check vaccination dates in the future
        today = datetime.date.today()
        for vax in vaccinations:
            vax_date_str = vax.get('date_administered')
            if vax_date_str:
                try:
                    if isinstance(vax_date_str, str):
                        vax_date = datetime.datetime.strptime(vax_date_str, '%Y-%m-%d').date()
                    else:
                        vax_date = vax_date_str

                    if vax_date > today:
                        warnings.append({
                            'type': 'date_in_future',
                            'severity': 'warning',
                            'message': f"Vaccination '{vax.get('vaccine_name', 'Unknown')}' has a future date ({vax_date}). Please verify.",
                            'field': 'vaccination',
                            'vaccine_name': vax.get('vaccine_name'),
                            'date': str(vax_date),
                        })
                except (ValueError, TypeError):
                    pass

        return warnings


class DocumentExtractNewDogView(APIView):
    """
    Extract dog information from an uploaded document for creating a new dog.

    POST /api/ai/extract-document-new/
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [AIRateThrottle]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        """
        Process uploaded document and extract dog information for a new dog.

        Request: multipart/form-data with 'document' file field

        Response:
        {
            "dog_info": {...},
            "lifestyle": {...},
            "vaccinations": [...],
            "confidence": {...}
        }
        """
        # Validate upload
        serializer = DocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uploaded_file = serializer.validated_data['document']

        try:
            # Read file data
            file_data = uploaded_file.read()

            # Extract information using AI
            extraction_result = document_extraction_service.extract_from_bytes(
                file_data,
                uploaded_file.name
            )

            # Log token usage
            token_usage = extraction_result.pop('_token_usage', None)
            if token_usage:
                log_token_usage(request.user, 'document_extract_new', token_usage)

            # Validate and serialize response
            response_serializer = DocumentExtractionResponseSerializer(
                data=extraction_result
            )

            if response_serializer.is_valid():
                response_data = response_serializer.data
                return Response(response_data, status=status.HTTP_200_OK)
            else:
                # Return raw result with validation errors
                return Response({
                    'extraction': extraction_result,
                    'validation_errors': response_serializer.errors,
                    'confidence': extraction_result.get('confidence', {
                        'overall': 'low',
                        'notes': 'Validation errors occurred'
                    })
                }, status=status.HTTP_200_OK)

        except (ValueError, ConnectionError, IOError) as e:
            logger.exception("Document extraction failed for new dog")
            return Response({
                'error': 'Document extraction failed. Please try again.',
                'confidence': {'overall': 'low', 'notes': 'Processing error occurred'}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ApplyExtractionView(APIView):
    """
    Apply extracted data to a dog.

    POST /api/dogs/{dog_id}/apply-extraction/
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [AIRateThrottle]

    def post(self, request, dog_id: int):
        """
        Apply user-selected extracted data to update dog and add vaccinations.

        Request body:
        {
            "dog_info": {"name": "...", "breed": "...", ...},
            "lifestyle": {"env_indoor_only": true, ...},
            "vaccinations": [{...}, ...]
        }

        Response:
        {
            "dog_updated": true,
            "fields_updated": ["name", "breed", ...],
            "vaccinations_added": 3,
            "vaccinations_skipped": 1,
            "skipped_reasons": ["Duplicate: DAP on 2024-01-01"]
        }
        """
        # Verify dog ownership
        dog = get_object_or_404(
            Dog.objects.filter(owner=request.user),
            pk=dog_id
        )

        serializer = ApplyExtractionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        fields_updated = []
        vaccinations_added = 0
        vaccinations_skipped = 0
        skipped_reasons = []

        # Update dog info
        dog_info = data.get('dog_info', {})
        for field, value in dog_info.items():
            if value is not None and hasattr(dog, field):
                setattr(dog, field, value)
                fields_updated.append(field)

        # Update lifestyle
        lifestyle = data.get('lifestyle', {})
        for field, value in lifestyle.items():
            if value is not None and hasattr(dog, field):
                setattr(dog, field, value)
                fields_updated.append(field)

        if fields_updated:
            dog.save()

        # Add vaccinations
        vaccinations = data.get('vaccinations', [])
        for vax in vaccinations:
            # Try to match vaccine by name
            vaccine = self._find_vaccine(vax.get('vaccine_name', ''), user=request.user)

            if not vaccine:
                vaccinations_skipped += 1
                skipped_reasons.append(
                    f"Unknown vaccine: {vax.get('vaccine_name', 'unnamed')}"
                )
                continue

            # Check for date - it's required
            date_administered = vax.get('date_administered')
            if not date_administered:
                vaccinations_skipped += 1
                skipped_reasons.append(
                    f"Missing date for: {vax.get('vaccine_name', 'unnamed')}"
                )
                continue

            # Check for duplicates
            existing = VaccinationRecord.objects.filter(
                dog=dog,
                vaccine=vaccine,
                date_administered=date_administered
            ).exists()

            if existing:
                vaccinations_skipped += 1
                skipped_reasons.append(
                    f"Duplicate: {vaccine.name} on {date_administered}"
                )
                continue

            # Create vaccination record
            VaccinationRecord.objects.create(
                dog=dog,
                vaccine=vaccine,
                date_administered=date_administered,
                dose_number=vax.get('dose_number'),
                notes=vax.get('notes') or '',
                administered_by=vax.get('administered_by') or ''
            )
            vaccinations_added += 1

        return Response({
            'dog_updated': len(fields_updated) > 0,
            'fields_updated': fields_updated,
            'vaccinations_added': vaccinations_added,
            'vaccinations_skipped': vaccinations_skipped,
            'skipped_reasons': skipped_reasons,
        }, status=status.HTTP_200_OK)

    def _find_vaccine(self, vaccine_name: str, user=None) -> Optional[Vaccine]:
        """
        Find a vaccine by name using AI-powered matching.
        """
        return vaccine_matcher_ai.match_vaccine(vaccine_name, user=user)
