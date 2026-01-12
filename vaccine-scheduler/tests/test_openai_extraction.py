"""
Unit tests for document extraction with OpenAI provider.

Tests the DocumentExtractionService class with mocked LLM responses.
No actual API calls are made - tests use unittest.mock to simulate responses.

Test fixtures:
- tests/fixtures/test1.{jpg|png} - Sample vaccination record image (user-provided)
- tests/fixtures/test1.json - Expected extraction output (user-provided)
"""

import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


class TestDocumentExtractionOpenAI(unittest.TestCase):
    """Tests for document extraction using OpenAI provider."""

    FIXTURES_DIR = Path(__file__).parent / "fixtures"

    @classmethod
    def setUpClass(cls):
        """Load test fixtures once for all tests."""
        cls.test1_expected = cls._load_expected_output("test1.json")
        # Find test image (supports multiple extensions)
        cls.test1_image_path = cls._find_test_image("test1")

    @classmethod
    def _load_expected_output(cls, filename: str) -> dict:
        """Load expected output JSON from fixtures."""
        path = cls.FIXTURES_DIR / filename
        if path.exists():
            with open(path) as f:
                return json.load(f)
        # Return sample structure if fixture not yet created
        return {
            "dog_info": {
                "name": "Buddy",
                "breed": "Golden Retriever",
                "birth_date": "2023-06-15",
                "weight_kg": 28.5,
                "sex": "MN"
            },
            "lifestyle": {
                "env_indoor_only": False,
                "env_dog_parks": True,
                "env_daycare_boarding": False,
                "env_travel_shows": False
            },
            "vaccinations": [
                {
                    "vaccine_name": "DAP (DHPP)",
                    "date_administered": "2023-08-15",
                    "dose_number": 1,
                    "administered_by": "Valley Vet Clinic",
                    "notes": None
                }
            ],
            "confidence": {
                "overall": "high",
                "notes": "Clear veterinary record with typed text"
            }
        }

    @classmethod
    def _find_test_image(cls, base_name: str) -> Path:
        """Find test image file with any supported extension."""
        extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        for ext in extensions:
            path = cls.FIXTURES_DIR / f"{base_name}{ext}"
            if path.exists():
                return path
        # Return default path if not found (tests will handle missing file)
        return cls.FIXTURES_DIR / f"{base_name}.png"

    def setUp(self):
        """Set up test instance with fresh service."""
        # Import here to avoid import issues during test collection
        from apps.ai_analysis.document_extraction import DocumentExtractionService
        self.service = DocumentExtractionService()

    def _get_mock_image_bytes(self) -> bytes:
        """Get test image bytes or create dummy bytes if file not found."""
        if self.test1_image_path.exists():
            with open(self.test1_image_path, 'rb') as f:
                return f.read()
        # Return minimal valid PNG for testing
        return b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'

    @patch.dict(os.environ, {"LLM_PROVIDER": "openai", "OPENAI_API_KEY": "test-key"})
    @patch("apps.ai_analysis.document_extraction.get_vision_llm")
    def test_extraction_returns_valid_structure(self, mock_get_llm):
        """
        Test 1: Verify OpenAI extraction returns correctly structured JSON.

        Given: A test image and mocked OpenAI response
        When: extract_from_bytes is called
        Then: Returns dict with dog_info, vaccinations, confidence keys
        """
        # Setup mock
        mock_llm = MagicMock()
        mock_response = MagicMock()
        mock_response.content = json.dumps(self.test1_expected)
        mock_llm.invoke.return_value = mock_response
        mock_get_llm.return_value = mock_llm

        # Reset LLM to use mock
        self.service._llm = None

        # Execute
        image_bytes = self._get_mock_image_bytes()
        result = self.service.extract_from_bytes(image_bytes, "test1.jpg")

        # Assert structure
        self.assertIn("dog_info", result)
        self.assertIn("vaccinations", result)
        self.assertIn("confidence", result)

        # Assert dog_info structure
        dog_info = result.get("dog_info", {})
        expected_fields = ["name", "breed", "birth_date", "weight_kg", "sex"]
        for field in expected_fields:
            self.assertIn(field, dog_info, f"dog_info should contain '{field}'")

    @patch.dict(os.environ, {"LLM_PROVIDER": "openai", "OPENAI_API_KEY": "test-key"})
    @patch("apps.ai_analysis.document_extraction.get_vision_llm")
    def test_extraction_matches_expected_output(self, mock_get_llm):
        """
        Test 2: Verify extraction output matches expected test1.json values.

        Given: test1 image and expected test1.json output
        When: extract_from_bytes is called with mocked response
        Then: Extracted values match expected JSON
        """
        mock_llm = MagicMock()
        mock_response = MagicMock()
        mock_response.content = json.dumps(self.test1_expected)
        mock_llm.invoke.return_value = mock_response
        mock_get_llm.return_value = mock_llm

        self.service._llm = None

        image_bytes = self._get_mock_image_bytes()
        result = self.service.extract_from_bytes(image_bytes, "test1.jpg")

        # Compare with expected
        self.assertEqual(
            result.get("dog_info", {}).get("name"),
            self.test1_expected["dog_info"].get("name")
        )
        self.assertEqual(
            result.get("dog_info", {}).get("breed"),
            self.test1_expected["dog_info"].get("breed")
        )
        self.assertEqual(
            result.get("confidence", {}).get("overall"),
            self.test1_expected["confidence"].get("overall")
        )

    @patch.dict(os.environ, {"LLM_PROVIDER": "openai", "OPENAI_API_KEY": "test-key"})
    @patch("apps.ai_analysis.document_extraction.get_vision_llm")
    def test_handles_malformed_response(self, mock_get_llm):
        """
        Test 3: Verify graceful handling of malformed LLM responses.

        Given: OpenAI returns non-JSON response
        When: extract_from_bytes is called
        Then: Returns error structure with low confidence
        """
        mock_llm = MagicMock()
        mock_response = MagicMock()
        mock_response.content = "This is not valid JSON at all"
        mock_llm.invoke.return_value = mock_response
        mock_get_llm.return_value = mock_llm

        self.service._llm = None

        image_bytes = self._get_mock_image_bytes()
        result = self.service.extract_from_bytes(image_bytes, "test1.jpg")

        # Should have error handling result
        self.assertIn("confidence", result)
        self.assertEqual(result["confidence"]["overall"], "low")
        self.assertIn("error", result)

    @patch.dict(os.environ, {"LLM_PROVIDER": "openai", "OPENAI_API_KEY": "test-key"})
    @patch("apps.ai_analysis.document_extraction.get_vision_llm")
    def test_vaccination_list_parsing(self, mock_get_llm):
        """
        Test 4: Verify vaccination list is correctly parsed.

        Given: Response with multiple vaccinations
        When: extract_from_bytes is called
        Then: All vaccinations are extracted with correct fields
        """
        expected_with_vaccinations = {
            "dog_info": {
                "name": "Max",
                "breed": "Labrador",
                "birth_date": "2023-01-10",
                "weight_kg": 32.0,
                "sex": "M"
            },
            "lifestyle": {
                "env_indoor_only": False,
                "env_dog_parks": True,
                "env_daycare_boarding": True,
                "env_travel_shows": False
            },
            "vaccinations": [
                {
                    "vaccine_name": "DAP (DHPP)",
                    "date_administered": "2023-03-15",
                    "dose_number": 1,
                    "administered_by": "Happy Paws Vet",
                    "notes": None
                },
                {
                    "vaccine_name": "Rabies",
                    "date_administered": "2023-05-01",
                    "dose_number": 1,
                    "administered_by": "Happy Paws Vet",
                    "notes": "3-year vaccine"
                },
                {
                    "vaccine_name": "Bordetella",
                    "date_administered": "2023-06-15",
                    "dose_number": 1,
                    "administered_by": "Happy Paws Vet",
                    "notes": "Required for daycare"
                }
            ],
            "confidence": {
                "overall": "high",
                "notes": "Clear vaccination record"
            }
        }

        mock_llm = MagicMock()
        mock_response = MagicMock()
        mock_response.content = json.dumps(expected_with_vaccinations)
        mock_llm.invoke.return_value = mock_response
        mock_get_llm.return_value = mock_llm

        self.service._llm = None

        image_bytes = self._get_mock_image_bytes()
        result = self.service.extract_from_bytes(image_bytes, "test1.jpg")

        vaccinations = result.get("vaccinations", [])
        self.assertEqual(len(vaccinations), 3)
        self.assertEqual(vaccinations[0]["vaccine_name"], "DAP (DHPP)")
        self.assertEqual(vaccinations[1]["vaccine_name"], "Rabies")
        self.assertEqual(vaccinations[2]["vaccine_name"], "Bordetella")

        # Verify vaccination structure
        for vacc in vaccinations:
            self.assertIn("vaccine_name", vacc)
            self.assertIn("date_administered", vacc)
            self.assertIn("dose_number", vacc)


if __name__ == "__main__":
    unittest.main()
