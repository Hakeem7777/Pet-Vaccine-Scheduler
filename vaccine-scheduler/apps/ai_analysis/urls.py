"""
URL configuration for ai_analysis app.
"""
from django.urls import path

from .views import (
    AIStatusView,
    AIQueryView,
    DogAIAnalysisView,
    AIChatView,
    DocumentExtractView,
    DocumentExtractNewDogView,
    ApplyExtractionView,
)
from .health import HealthCheckView

app_name = 'ai_analysis'

urlpatterns = [
    # Health check endpoint
    path('health/', HealthCheckView.as_view(), name='health-check'),

    # AI service status
    path('ai/status/', AIStatusView.as_view(), name='ai-status'),

    # General AI query
    path('ai/query/', AIQueryView.as_view(), name='ai-query'),

    # Dog-specific AI analysis
    path('dogs/<int:dog_id>/ai-analysis/', DogAIAnalysisView.as_view(), name='dog-ai-analysis'),

    # Conversational chat
    path('ai/chat/', AIChatView.as_view(), name='ai-chat'),

    # Document extraction
    path('dogs/<int:dog_id>/extract-document/', DocumentExtractView.as_view(), name='dog-extract-document'),
    path('dogs/<int:dog_id>/apply-extraction/', ApplyExtractionView.as_view(), name='dog-apply-extraction'),

    # Document extraction for new dog (no existing dog required)
    path('ai/extract-document-new/', DocumentExtractNewDogView.as_view(), name='extract-document-new'),
]
