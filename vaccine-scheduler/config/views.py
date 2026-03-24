"""
Views for serving the React SPA frontend.
"""
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


def robots_txt(request):
    """Serve robots.txt to discourage crawling of sensitive paths."""
    lines = [
        "User-agent: *",
        "Allow: /",
        "",
        "# Block sensitive paths",
        "Disallow: /api/",
        "Disallow: /admin/",
        "Disallow: /.env",
        "Disallow: /.git/",
        "Disallow: /static/",
    ]
    return HttpResponse("\n".join(lines), content_type="text/plain")


def security_txt(request):
    """Serve /.well-known/security.txt per RFC 9116."""
    lines = [
        "Contact: mailto:raufsubhan45@gmail.com",
        "Preferred-Languages: en",
        "Canonical: https://petvaxcalendar.com/.well-known/security.txt",
        "Expires: 2027-03-24T00:00:00.000Z",
    ]
    return HttpResponse("\n".join(lines), content_type="text/plain")


