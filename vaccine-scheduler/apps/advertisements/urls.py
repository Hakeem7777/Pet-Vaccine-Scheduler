from django.urls import path
from .views import (
    AdminAdvertisementListCreateView,
    AdminAdvertisementDetailView,
    ActiveAdvertisementListView,
)

app_name = 'advertisements'

urlpatterns = [
    # Admin endpoints
    path('admin-panel/advertisements/', AdminAdvertisementListCreateView.as_view(), name='admin-ad-list-create'),
    path('admin-panel/advertisements/<int:pk>/', AdminAdvertisementDetailView.as_view(), name='admin-ad-detail'),

    # Public endpoint
    path('advertisements/active/', ActiveAdvertisementListView.as_view(), name='active-ads'),
]
