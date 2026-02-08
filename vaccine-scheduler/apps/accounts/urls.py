"""
URL configuration for accounts app.
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterView,
    LoginView,
    UserProfileView,
    PasswordChangeView,
    LogoutView,
)

app_name = 'accounts'

urlpatterns = [
    # Registration
    path('register/', RegisterView.as_view(), name='register'),

    # JWT Token endpoints
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # User profile
    path('me/', UserProfileView.as_view(), name='profile'),
    path('password/change/', PasswordChangeView.as_view(), name='password_change'),
]
