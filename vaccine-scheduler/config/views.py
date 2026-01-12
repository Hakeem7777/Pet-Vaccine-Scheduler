"""
Views for serving the React SPA frontend.
"""
import os
from pathlib import Path
from django.http import HttpResponse, Http404
from django.conf import settings


def serve_react_app(request, path=''):
    """
    Serve the React SPA for all non-API routes.
    WhiteNoise handles static assets, this handles SPA routing.
    """
    frontend_build_dir = getattr(settings, 'FRONTEND_BUILD_DIR', None)

    if not frontend_build_dir or not frontend_build_dir.exists():
        raise Http404("Frontend build not found")

    index_path = frontend_build_dir / 'index.html'

    if not index_path.exists():
        raise Http404("index.html not found")

    with open(index_path, 'r', encoding='utf-8') as f:
        content = f.read()

    return HttpResponse(content, content_type='text/html')


def health_check(request):
    """
    Simple health check endpoint for Render.
    """
    return HttpResponse("OK", content_type="text/plain")
