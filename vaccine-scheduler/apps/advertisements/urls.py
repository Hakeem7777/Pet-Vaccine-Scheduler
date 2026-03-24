from django.urls import path
from .views import (
    AdminAdvertisementListCreateView,
    AdminAdvertisementDetailView,
    ActiveAdvertisementListView,
    AdClickTrackView,
    AdminAdAnalyticsView,
)

app_name = 'advertisements'

urlpatterns = [
    # Admin endpoints
    path('admin-panel/advertisements/', AdminAdvertisementListCreateView.as_view(), name='admin-ad-list-create'),
    path('admin-panel/advertisements/<int:pk>/', AdminAdvertisementDetailView.as_view(), name='admin-ad-detail'),
    path('admin-panel/advertisements/<int:pk>/analytics/', AdminAdAnalyticsView.as_view(), name='admin-ad-analytics'),

    # Public endpoints
    path('advertisements/active/', ActiveAdvertisementListView.as_view(), name='active-ads'),
    path('advertisements/<int:pk>/click/', AdClickTrackView.as_view(), name='ad-click-track'),
]
