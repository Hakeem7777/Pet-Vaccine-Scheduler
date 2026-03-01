from django.urls import path

from . import views

urlpatterns = [
    path('plans/', views.SubscriptionPlansView.as_view(), name='subscription-plans'),
    path('status/', views.SubscriptionStatusView.as_view(), name='subscription-status'),
    path('create/', views.CreateSubscriptionView.as_view(), name='subscription-create'),
    path('cancel/', views.CancelSubscriptionView.as_view(), name='subscription-cancel'),
    path('webhook/', views.PayPalWebhookView.as_view(), name='paypal-webhook'),
]
