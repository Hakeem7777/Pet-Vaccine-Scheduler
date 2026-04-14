"""
URL configuration for patients app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import DogViewSet, DogDocumentViewSet

app_name = 'patients'

router = DefaultRouter()
router.register(r'dogs', DogViewSet, basename='dog')

urlpatterns = [
    path('', include(router.urls)),

    # Dog documents
    path(
        'dogs/<int:dog_id>/documents/',
        DogDocumentViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='dog-documents-list',
    ),
    path(
        'dogs/<int:dog_id>/documents/<int:pk>/',
        DogDocumentViewSet.as_view({'get': 'retrieve', 'delete': 'destroy'}),
        name='dog-documents-detail',
    ),
]
