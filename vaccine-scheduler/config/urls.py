from django.http import FileResponse, Http404
from django.conf import settings
from pathlib import Path
"""
URL configuration for vaccine-scheduler project.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static

from .views import serve_react_app, health_check, robots_txt, security_txt

def sitemap_xml(request):
    sitemap_path = Path(settings.BASE_DIR) / "sitemap.xml"
    if not sitemap_path.exists():
        raise Http404("Sitemap not found.")
    return FileResponse(open(sitemap_path, "rb"), content_type="application/xml")
    
urlpatterns = [
    # Health check endpoint (for Render)
    path('api/health/', health_check, name='health_check'),

    # Security / SEO files (must be before the catch-all SPA route)
    path('robots.txt', robots_txt, name='robots_txt'),
    path('.well-known/security.txt', security_txt, name='security_txt'),

    # Admin
    path('admin/', admin.site.urls),
    path("sitemap.xml", sitemap_xml),

    # API endpoints
    path('api/auth/', include('apps.accounts.urls')),
    path('api/', include('apps.patients.urls')),
    path('api/', include('apps.vaccinations.urls')),
    path('api/', include('apps.ai_analysis.urls')),
    path('api/email/', include('apps.email_service.urls')),
    path('api/', include('apps.dashboard.urls')),
    path('api/subscriptions/', include('apps.subscriptions.urls')),
    path('api/', include('apps.blog.urls')),
    path('api/', include('apps.advertisements.urls')),
    path('api/', include('apps.help_videos.urls')),

]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Serve React SPA for all other routes (only in production with frontend build)
if not settings.DEBUG:
    urlpatterns += [
        # Catch-all for React SPA routing (must be last)
        re_path(r'^(?!api/|admin/|static/).*$', serve_react_app, name='react_app'),
    ]
