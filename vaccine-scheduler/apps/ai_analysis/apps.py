import logging
import os
import sys
import threading
import time
from django.apps import AppConfig

logger = logging.getLogger(__name__)


def _delayed_initialize():
    """Wait for Django to finish booting before importing heavy ML libs.

    numpy imports are not thread-safe and will fail with a circular-import
    error if another thread (e.g. Django system checks) is importing numpy
    at the same time.  A short sleep lets Django finish its startup imports
    before the background thread begins its own.
    """
    time.sleep(3)
    from .services import rag_service
    rag_service.initialize()


class AiAnalysisConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ai_analysis'
    verbose_name = 'AI Analysis'

    def ready(self):
        """
        Initialize RAG pipeline when Django starts.
        Runs in a background thread after a short delay to avoid
        racing with Django's own imports (numpy circular-import issue).
        """
        # For runserver: only initialize in the reloader child process
        is_runserver = 'runserver' in sys.argv
        is_gunicorn = sys.argv and 'gunicorn' in sys.argv[0]

        if is_runserver:
            if os.environ.get('RUN_MAIN') != 'true':
                return
        elif not is_gunicorn:
            return

        thread = threading.Thread(target=_delayed_initialize, daemon=True)
        thread.start()
        logger.info("RAG pipeline initialization scheduled (3s delay)")
