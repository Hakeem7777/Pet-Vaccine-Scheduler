"""
URL configuration for patients app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import DogViewSet

app_name = 'patients'

router = DefaultRouter()
router.register(r'dogs', DogViewSet, basename='dog')

urlpatterns = [
    path('', include(router.urls)),
]
