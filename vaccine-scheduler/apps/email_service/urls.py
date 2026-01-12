"""
URL configuration for email service.
"""
from django.urls import path

from .views import SendScheduleEmailView

app_name = 'email_service'

urlpatterns = [
    path('send-schedule/', SendScheduleEmailView.as_view(), name='send-schedule'),
]
