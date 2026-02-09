"""
Centralized configuration for vaccine-scheduler.

This module provides all configurable values in one place,
following rules.md requirement for no magic strings/hardcoded values.

Supports both standalone mode (original Streamlit app) and Django integration.
"""

import os
from pathlib import Path

# Detect if running under Django
DJANGO_SETTINGS_MODULE = os.environ.get('DJANGO_SETTINGS_MODULE')

if DJANGO_SETTINGS_MODULE:
    # Running under Django - use Django settings for paths
    try:
        from django.conf import settings
        PROJECT_ROOT = Path(settings.BASE_DIR)
        DATA_DIR = PROJECT_ROOT / "data"
        CONTEXT_DIR = getattr(settings, 'LLM_CONTEXT_DIR', PROJECT_ROOT / "llm_context")
    except Exception:
        # Fallback if Django not fully configured
        PROJECT_ROOT = Path(__file__).parent.parent
        DATA_DIR = PROJECT_ROOT / "data"
        CONTEXT_DIR = PROJECT_ROOT / "llm_context"
else:
    # Standalone mode (original Streamlit app or testing)
    PROJECT_ROOT = Path(__file__).parent.parent
    DATA_DIR = PROJECT_ROOT / "data"
    CONTEXT_DIR = PROJECT_ROOT / "llm_context"

# File paths (same for both modes)
VACCINE_RULES_PATH = DATA_DIR / "vaccine_rules.json"
PROCESSED_FILES_PATH = DATA_DIR / "processed_files.json"

# LLM Provider Configuration
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini")  # "gemini" or "openai"

# LLM Configuration
LLM_MODEL = os.getenv("LLM_MODEL", "")  # Empty means use provider default
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.3"))

# Default models per provider
DEFAULT_CHAT_MODELS = {
    "gemini": "gemini-2.5-flash",
    "openai": "gpt-4o-2024-08-06"
}

DEFAULT_VISION_MODELS = {
    "gemini": "gemini-2.0-flash",
    "openai": "gpt-4o-2024-08-06"
}

# Scheduler settings
UPCOMING_WINDOW_DAYS = 30  # Days to consider a vaccine as "upcoming"
DEFAULT_COUNTRY = "US"

# Age classification thresholds (in weeks)
AGE_PUPPY_MAX_WEEKS = 16
AGE_ADOLESCENT_MAX_WEEKS = 52
AGE_ADULT_MAX_YEARS = 7

# Document processing
SUPPORTED_EXTENSIONS = ('.pdf', '.txt')
RETRIEVER_K = 3

# Embedding Configuration
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

# Reminder Settings
REMINDER_MIN_INTERVAL_HOURS = int(os.getenv('REMINDER_MIN_INTERVAL_HOURS', '1'))
REMINDER_MAX_LEAD_TIME_DAYS = int(os.getenv('REMINDER_MAX_LEAD_TIME_DAYS', '90'))
REMINDER_DEFAULT_LEAD_TIME_DAYS = int(os.getenv('REMINDER_DEFAULT_LEAD_TIME_DAYS', '7'))
REMINDER_DEFAULT_INTERVAL_HOURS = int(os.getenv('REMINDER_DEFAULT_INTERVAL_HOURS', '24'))
