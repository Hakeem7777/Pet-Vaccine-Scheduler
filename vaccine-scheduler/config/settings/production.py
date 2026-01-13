"""
Django production settings.
"""
import os
from pathlib import Path
from .base import *  # noqa: F401, F403

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

# Allowed hosts from environment
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'pet-vaccine-scheduler.onrender.com,.onrender.com').split(',')
ALLOWED_HOSTS = [h.strip() for h in ALLOWED_HOSTS if h.strip()]

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
