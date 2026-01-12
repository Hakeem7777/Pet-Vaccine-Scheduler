"""
URL configuration for vaccinations app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    VaccineViewSet,
    VaccinationRecordViewSet,
    ScheduleView,
    HistoryAnalysisView,
)

app_name = 'vaccinations'

router = DefaultRouter()
router.register(r'vaccines', VaccineViewSet, basename='vaccine')

urlpatterns = [
    # Vaccine catalog
    path('', include(router.urls)),

    # Dog-specific vaccination endpoints
    path(
        'dogs/<int:dog_id>/vaccinations/',
        VaccinationRecordViewSet.as_view({
            'get': 'list',
            'post': 'create'
        }),
        name='dog-vaccinations-list'
    ),
    path(
        'dogs/<int:dog_id>/vaccinations/<int:pk>/',
        VaccinationRecordViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update',
            'delete': 'destroy'
        }),
        name='dog-vaccinations-detail'
    ),

    # Schedule calculation
    path(
        'dogs/<int:dog_id>/schedule/',
        ScheduleView.as_view(),
        name='dog-schedule'
    ),
    path(
        'dogs/<int:dog_id>/schedule/history-analysis/',
        HistoryAnalysisView.as_view(),
        name='dog-history-analysis'
    ),
]
