from django.urls import path

from . import views

urlpatterns = [
    path('plans/', views.SubscriptionPlansView.as_view(), name='subscription-plans'),
    path('status/', views.SubscriptionStatusView.as_view(), name='subscription-status'),
    path('create/', views.CreateSubscriptionView.as_view(), name='subscription-create'),
    path('cancel/', views.CancelSubscriptionView.as_view(), name='subscription-cancel'),
    path('redeem-promo/', views.RedeemPromoCodeView.as_view(), name='redeem-promo'),
    path('webhook/', views.PayPalWebhookView.as_view(), name='paypal-webhook'),
    path('stripe/create-checkout/', views.CreateStripeCheckoutView.as_view(), name='stripe-create-checkout'),
    path('stripe/webhook/', views.StripeWebhookView.as_view(), name='stripe-webhook'),
    path('pdf-export/record/', views.RecordPdfExportView.as_view(), name='pdf-export-record'),
]
