"""
URL configuration for email service.
"""
from django.urls import path

from .views import SendScheduleEmailView, ContactFormView

app_name = 'email_service'

urlpatterns = [
    path('send-schedule/', SendScheduleEmailView.as_view(), name='send-schedule'),
    path('contact/', ContactFormView.as_view(), name='contact'),
]
