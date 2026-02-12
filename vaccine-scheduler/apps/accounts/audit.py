"""
Audit logging for security-critical actions.

Records login attempts, password changes, logouts, and other
security-relevant events with IP address and user agent.
"""
from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """Immutable log of security-relevant user actions."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=50, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default='')
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"{self.action} by {self.user_id} at {self.created_at}"


def get_client_ip(request):
    """Extract client IP, respecting X-Forwarded-For from reverse proxies."""
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_audit(request, action, user=None, details=None):
    """
    Create an audit log entry.

    Args:
        request: The HTTP request object
        action: Short action identifier (e.g. 'login_success', 'password_changed')
        user: The user performing the action (defaults to request.user)
        details: Optional dict with additional context
    """
    if user is None and hasattr(request, 'user') and request.user.is_authenticated:
        user = request.user

    AuditLog.objects.create(
        user=user,
        action=action,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
        details=details or {},
    )
