from rest_framework.permissions import BasePermission


class HasActiveSubscription(BasePermission):
    message = 'An active subscription is required to access this feature.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        sub = getattr(request.user, 'subscription', None)
        if sub is None:
            try:
                from .models import Subscription
                sub = Subscription.objects.filter(user=request.user).first()
            except Exception:
                return False
        return sub is not None and sub.is_active


class HasProSubscription(BasePermission):
    message = 'A Pro Care subscription is required to access this feature.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        sub = getattr(request.user, 'subscription', None)
        if sub is None:
            try:
                from .models import Subscription
                sub = Subscription.objects.filter(user=request.user).first()
            except Exception:
                return False
        return sub is not None and sub.is_active and sub.plan == 'pro'
