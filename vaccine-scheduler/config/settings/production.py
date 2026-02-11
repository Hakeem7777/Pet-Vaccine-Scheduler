"""
Django production settings.
"""
import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401, F403

# Validate SECRET_KEY is set and not the insecure default
_secret_key = os.getenv('SECRET_KEY', '')
if not _secret_key or 'django-insecure' in _secret_key:
    raise ImproperlyConfigured(
        'SECRET_KEY must be set to a secure value in production. '
        'Generate one with: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"'
    )
SECRET_KEY = _secret_key

DEBUG = False

# Security settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# HTTPS settings (Render handles SSL termination)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'True').lower() in ('true', '1', 'yes')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Allowed hosts from environment (use default if env var is empty or not set)
_allowed_hosts_env = os.getenv('ALLOWED_HOSTS', '').strip()
ALLOWED_HOSTS = _allowed_hosts_env.split(',') if _allowed_hosts_env else [
    'pet-vaccine-scheduler.onrender.com',
    '.onrender.com',
    'petvaxcalendar.com',
    'www.petvaxcalendar.com',
]
ALLOWED_HOSTS = [h.strip() for h in ALLOWED_HOSTS if h.strip()]

# CSRF trusted origins (required for POST requests from these domains)
_csrf_origins_env = os.getenv('CSRF_TRUSTED_ORIGINS', '').strip()
CSRF_TRUSTED_ORIGINS = _csrf_origins_env.split(',') if _csrf_origins_env else [
    'https://petvaxcalendar.com',
    'https://www.petvaxcalendar.com',
    'https://pet-vaccine-scheduler.onrender.com',
]
CSRF_TRUSTED_ORIGINS = [o.strip() for o in CSRF_TRUSTED_ORIGINS if o.strip()]

# WhiteNoise for static file serving
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')

# Static files configuration
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Frontend build directory (React SPA)
FRONTEND_BUILD_DIR = BASE_DIR / 'frontend_build'

# Add frontend build to static files dirs if it exists
if FRONTEND_BUILD_DIR.exists():
    STATICFILES_DIRS = [FRONTEND_BUILD_DIR]
    WHITENOISE_ROOT = FRONTEND_BUILD_DIR

# WhiteNoise settings
WHITENOISE_INDEX_FILE = True  # Serve index.html for root
WHITENOISE_SKIP_COMPRESS_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'zip', 'gz', 'tgz', 'bz2', 'tbz', 'xz', 'br', 'swf', 'flv', 'woff', 'woff2']

# CORS settings for production
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv('CORS_ALLOWED_ORIGINS', '').split(',')
    if origin.strip()
]

# If no specific origins set, allow same-origin (frontend served from same domain)
if not CORS_ALLOWED_ORIGINS:
    CORS_ALLOW_ALL_ORIGINS = False
    # Allow requests from the same host
    CORS_ALLOW_CREDENTIALS = True
