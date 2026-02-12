"""
Django development settings.
"""
from .base import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# More permissive CORS for development
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Cookies over HTTP in development (Secure=True would block localhost)
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Trust the Vite dev server origin for CSRF
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]

# Disable CSP in development (it blocks cross-origin requests from Vite dev server)
MIDDLEWARE = [m for m in MIDDLEWARE if m != 'csp.middleware.CSPMiddleware']