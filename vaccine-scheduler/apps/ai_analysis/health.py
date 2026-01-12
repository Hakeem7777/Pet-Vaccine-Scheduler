"""
Health check endpoint for the vaccine scheduler backend.
"""
import os

from django.db import connection
from django.db.utils import OperationalError
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.config import LLM_PROVIDER, LLM_MODEL, DEFAULT_CHAT_MODELS


class HealthCheckView(APIView):
    """
    Health check endpoint to verify backend server status.

    GET /api/health/

    No authentication required.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        """
        Return health status of the backend.

        Response:
        {
            "status": "healthy" | "degraded" | "unhealthy",
            "checks": {
                "database": true | false,
                "llm_configured": true | false
            },
            "config": {
                "llm_provider": "gemini" | "openai",
                "llm_model": "model-name"
            },
            "version": "1.0.0"
        }
        """
        checks = {
            "database": self._check_database(),
            "llm_configured": self._check_llm_configured()
        }

        # Determine overall status
        if all(checks.values()):
            overall_status = "healthy"
            http_status = status.HTTP_200_OK
        elif checks["database"]:
            overall_status = "degraded"
            http_status = status.HTTP_200_OK
        else:
            overall_status = "unhealthy"
            http_status = status.HTTP_503_SERVICE_UNAVAILABLE

        # Get effective model name
        effective_model = LLM_MODEL or DEFAULT_CHAT_MODELS.get(LLM_PROVIDER, "unknown")

        return Response({
            "status": overall_status,
            "checks": checks,
            "config": {
                "llm_provider": LLM_PROVIDER,
                "llm_model": effective_model
            },
            "version": "1.0.0"
        }, status=http_status)

    def _check_database(self) -> bool:
        """Check if database connection is working."""
        try:
            connection.ensure_connection()
            return True
        except OperationalError:
            return False

    def _check_llm_configured(self) -> bool:
        """Check if LLM API key is configured for the selected provider."""
        if LLM_PROVIDER == "openai":
            return bool(os.getenv("OPENAI_API_KEY"))
        else:
            return bool(os.getenv("GOOGLE_API_KEY"))
