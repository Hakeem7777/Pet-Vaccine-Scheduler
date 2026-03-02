from django.urls import path
from .views import (
    AdminHelpVideoListCreateView,
    AdminHelpVideoDetailView,
    PublicHelpVideoListView,
    PublicHelpVideoDetailView,
)

app_name = 'help_videos'

urlpatterns = [
    # Admin endpoints
    path('admin-panel/help-videos/', AdminHelpVideoListCreateView.as_view(), name='admin-help-video-list-create'),
    path('admin-panel/help-videos/<int:pk>/', AdminHelpVideoDetailView.as_view(), name='admin-help-video-detail'),

    # Public endpoints
    path('help-videos/', PublicHelpVideoListView.as_view(), name='public-help-video-list'),
    path('help-videos/<slug:slug>/', PublicHelpVideoDetailView.as_view(), name='public-help-video-detail'),
]
