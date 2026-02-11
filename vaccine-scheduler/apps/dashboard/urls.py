from django.urls import path

from .views import (
    ClientDashboardView,
    ReminderPreferenceView,
    AdminStatsView,
    AdminUserListView,
    AdminUserToggleActiveView,
    AdminUserDeleteView,
    AdminUserExportCSVView,
    AdminDogListView,
    AdminDogDeleteView,
    AdminVaccinationListView,
    AdminContactListView,
    AdminContactReplyView,
    AdminGraphDataView,
    AdminTokenUsageListView,
    AdminTokenUsageStatsView,
    AdminAIAnalyticsView,
    AdminAIModelsView,
)

app_name = 'dashboard'

urlpatterns = [
    # Client dashboard
    path('dashboard/', ClientDashboardView.as_view(), name='client-dashboard'),
    path('dashboard/reminders/', ReminderPreferenceView.as_view(), name='reminder-preferences'),

    # Admin endpoints
    path('admin-panel/stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('admin-panel/users/', AdminUserListView.as_view(), name='admin-users'),
    path('admin-panel/users/export/', AdminUserExportCSVView.as_view(), name='admin-users-export'),
    path('admin-panel/users/<int:pk>/', AdminUserDeleteView.as_view(), name='admin-user-delete'),
    path('admin-panel/users/<int:pk>/toggle-active/', AdminUserToggleActiveView.as_view(), name='admin-user-toggle-active'),
    path('admin-panel/dogs/', AdminDogListView.as_view(), name='admin-dogs'),
    path('admin-panel/dogs/<int:pk>/', AdminDogDeleteView.as_view(), name='admin-dog-delete'),
    path('admin-panel/vaccinations/', AdminVaccinationListView.as_view(), name='admin-vaccinations'),
    path('admin-panel/contacts/', AdminContactListView.as_view(), name='admin-contacts'),
    path('admin-panel/contacts/<int:pk>/reply/', AdminContactReplyView.as_view(), name='admin-contact-reply'),
    path('admin-panel/graphs/', AdminGraphDataView.as_view(), name='admin-graphs'),
    path('admin-panel/token-usage/', AdminTokenUsageListView.as_view(), name='admin-token-usage'),
    path('admin-panel/token-usage/stats/', AdminTokenUsageStatsView.as_view(), name='admin-token-usage-stats'),
    path('admin-panel/ai-analytics/', AdminAIAnalyticsView.as_view(), name='admin-ai-analytics'),
    path('admin-panel/ai-models/', AdminAIModelsView.as_view(), name='admin-ai-models'),
]
