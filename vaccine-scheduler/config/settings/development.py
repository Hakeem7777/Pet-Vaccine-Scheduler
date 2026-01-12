"""
Django development settings.
"""
from .base import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# More permissive CORS for development (if needed later)
CORS_ALLOW_ALL_ORIGINS = True