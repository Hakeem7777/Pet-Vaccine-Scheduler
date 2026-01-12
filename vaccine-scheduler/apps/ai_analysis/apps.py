import logging
import threading
from django.apps import AppConfig

logger = logging.getLogger(__name__)


class AiAnalysisConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ai_analysis'
    verbose_name = 'AI Analysis'

    def ready(self):
        """
        Initialize RAG pipeline when Django starts.
        Runs in background thread to avoid blocking startup.
        """
        # Only initialize in the main process (not in migration commands, etc.)
        import sys
        if 'runserver' in sys.argv or 'gunicorn' in sys.argv[0] if sys.argv else False:
            from .services import rag_service
            thread = threading.Thread(target=rag_service.initialize, daemon=True)
            thread.start()
            logger.info("RAG pipeline initialization started in background")
