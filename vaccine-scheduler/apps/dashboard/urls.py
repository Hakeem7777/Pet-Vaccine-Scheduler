from django.urls import path

from .views import (
    ClientDashboardView,
    ReminderPreferenceView,
    AdminStatsView,
    AdminUserListView,
    AdminUserDeleteView,
    AdminDogListView,
    AdminDogDeleteView,
    AdminVaccinationListView,
    AdminContactListView,
    AdminContactReplyView,
)

app_name = 'dashboard'

urlpatterns = [
    # Client dashboard
    path('dashboard/', ClientDashboardView.as_view(), name='client-dashboard'),
    path('dashboard/reminders/', ReminderPreferenceView.as_view(), name='reminder-preferences'),

    # Admin endpoints
    path('admin-panel/stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('admin-panel/users/', AdminUserListView.as_view(), name='admin-users'),
    path('admin-panel/users/<int:pk>/', AdminUserDeleteView.as_view(), name='admin-user-delete'),
    path('admin-panel/dogs/', AdminDogListView.as_view(), name='admin-dogs'),
    path('admin-panel/dogs/<int:pk>/', AdminDogDeleteView.as_view(), name='admin-dog-delete'),
    path('admin-panel/vaccinations/', AdminVaccinationListView.as_view(), name='admin-vaccinations'),
    path('admin-panel/contacts/', AdminContactListView.as_view(), name='admin-contacts'),
    path('admin-panel/contacts/<int:pk>/reply/', AdminContactReplyView.as_view(), name='admin-contact-reply'),
]
