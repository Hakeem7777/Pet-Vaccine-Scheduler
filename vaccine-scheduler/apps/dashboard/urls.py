from django.urls import path

from .views import (
    ClientDashboardView,
    ClientReferralView,
    LeadCaptureView,
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
    AdminPromoCodeListCreateView,
    AdminPromoCodeDetailView,
    AdminPromoCodeRedemptionsView,
    AdminReferralStatsView,
    AdminLandingVideoListCreateView,
    AdminLandingVideoDetailView,
    LandingVideoPublicView,
)

app_name = 'dashboard'

urlpatterns = [
    # Client dashboard
    path('dashboard/', ClientDashboardView.as_view(), name='client-dashboard'),
    path('dashboard/reminders/', ReminderPreferenceView.as_view(), name='reminder-preferences'),
    path('dashboard/referrals/', ClientReferralView.as_view(), name='client-referrals'),
    path('leads/capture/', LeadCaptureView.as_view(), name='lead-capture'),
    path('landing-videos/<str:page_type>/', LandingVideoPublicView.as_view(), name='landing-video-public'),

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

    # Referrals
    path('admin-panel/referrals/', AdminReferralStatsView.as_view(), name='admin-referrals'),

    # Promo codes
    path('admin-panel/promo-codes/', AdminPromoCodeListCreateView.as_view(), name='admin-promo-codes'),
    path('admin-panel/promo-codes/<int:pk>/', AdminPromoCodeDetailView.as_view(), name='admin-promo-code-detail'),
    path('admin-panel/promo-codes/<int:pk>/redemptions/', AdminPromoCodeRedemptionsView.as_view(), name='admin-promo-code-redemptions'),

    # Landing page videos
    path('admin-panel/landing-videos/', AdminLandingVideoListCreateView.as_view(), name='admin-landing-videos'),
    path('admin-panel/landing-videos/<int:pk>/', AdminLandingVideoDetailView.as_view(), name='admin-landing-video-detail'),
]
