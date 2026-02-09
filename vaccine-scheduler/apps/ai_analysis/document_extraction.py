"""
Service for extracting dog information from uploaded documents using vision LLM.

Supports both Gemini and OpenAI vision models via the provider factory.
"""
import base64
import json
import logging
from pathlib import Path
from typing import Any, Dict

from langchain_core.messages import HumanMessage

from core.llm_providers import get_vision_llm

logger = logging.getLogger(__name__)

# Structured extraction prompt
EXTRACTION_PROMPT = """
Analyze this document (which may be a veterinary record, vaccination certificate,
or handwritten notes) and extract any dog-related information you can find.

Return a JSON object with the following structure. For any field you cannot
determine from the document, use null:

{
    "dog_info": {
        "name": "string or null",
        "breed": "string or null",
        "birth_date": "YYYY-MM-DD format or null",
        "weight_kg": "number or null",
        "sex": "M, F, MN (Male Neutered), or FS (Female Spayed) or null"
    },
    "lifestyle": {
        "env_indoor_only": "boolean or null",
        "env_dog_parks": "boolean or null",
        "env_daycare_boarding": "boolean or null",
        "env_travel_shows": "boolean or null"
    },
    "vaccinations": [
        {
            "vaccine_name": "string - name of vaccine",
            "date_administered": "YYYY-MM-DD format or null",
            "dose_number": "number or null",
            "administered_by": "string - vet/clinic name or null",
            "notes": "string or null"
        }
    ],
    "confidence": {
        "overall": "high, medium, or low",
        "notes": "string explaining any uncertainties or issues with the document"
    }
}

Important:
- For handwritten documents, do your best to interpret the text
- Convert any date formats to YYYY-MM-DD
- Convert weight to kilograms if given in pounds (divide by 2.205)
- Map common vaccine abbreviations (DHPP, DA2PP, etc.) to full names
- If the document is unclear or upside down, mention this in confidence.notes
- Only return valid JSON, no additional text
"""


class DocumentExtractionService:
    """
    Service for extracting dog information from uploaded documents.
    Uses Gemini's vision capabilities for document analysis.
    """

    def __init__(self):
        self._llm = None

    @property
    def llm(self):
        """Lazy initialization of the LLM using provider factory."""
        if self._llm is None:
            self._llm = get_vision_llm(temperature=0.1)
        return self._llm

    def extract_from_file(self, file_path: str) -> Dict[str, Any]:
        """
        Extract dog information from an uploaded file.

        Args:
            file_path: Path to the uploaded file

        Returns:
            Dict containing extracted information
        """
        file_path = Path(file_path)

        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        with open(file_path, 'rb') as f:
            file_data = f.read()

        return self.extract_from_bytes(file_data, file_path.name)

    def extract_from_bytes(self, file_data: bytes, filename: str) -> Dict[str, Any]:
        """
        Extract dog information from file bytes (for in-memory processing).

        Args:
            file_data: Raw file bytes
            filename: Original filename (for MIME type detection)

        Returns:
            Dict containing extracted information
        """
        base64_data = base64.standard_b64encode(file_data).decode('utf-8')
        mime_type = self._get_mime_type_from_name(filename)

        message = HumanMessage(
            content=[
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime_type};base64,{base64_data}"
                    }
                },
                {
                    "type": "text",
                    "text": EXTRACTION_PROMPT
                }
            ]
        )

        try:
            response = self.llm.invoke([message])
            result = self._parse_response(response.content)
            # Attach token usage metadata for tracking
            from apps.dashboard.token_tracking import extract_token_usage
            result['_token_usage'] = extract_token_usage(response)
            return result
        except Exception as e:
            logger.error(f"Document extraction failed: {e}", exc_info=True)
            raise

    def _get_mime_type_from_name(self, filename: str) -> str:
        """Get MIME type from filename."""
        ext = Path(filename).suffix.lower()
        mime_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.pdf': 'application/pdf',
        }
        return mime_types.get(ext, 'application/octet-stream')

    def _parse_response(self, response_text: str) -> Dict[str, Any]:
        """Parse the LLM response into structured data."""
        text = response_text.strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]

        try:
            return json.loads(text.strip())
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse extraction response: {e}")
            return {
                "error": "Failed to parse document",
                "raw_response": response_text[:500],
                "confidence": {"overall": "low", "notes": "Response parsing failed"}
            }


# Singleton instance
document_extraction_service = DocumentExtractionService()
