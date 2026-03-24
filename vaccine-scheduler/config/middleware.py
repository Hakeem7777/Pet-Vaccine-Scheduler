"""
Custom security middleware.
"""
import logging
import re

from django.http import Http404

logger = logging.getLogger('security')


class SecurityBlockMiddleware:
    """
    Blocks requests to known-malicious or sensitive file paths.
    Returns 404 (not 403) to avoid confirming file existence.
    Logs all blocked attempts for monitoring.
    """

    BLOCKED_PATH_PATTERN = re.compile(
        r'(?:^/\.env'
        r'|^/\.git'
        r'|^/\.svn'
        r'|^/\.hg'
        r'|^/\.DS_Store'
        r'|/wp-login\.php'
        r'|/wp-admin'
        r'|/wp-content'
        r'|/wp-includes'
        r'|/wp-config\.php'
        r'|/xmlrpc\.php'
        r'|/wlwmanifest\.xml'
        r'|\.php(?:\?|$)'
        r'|\.asp(?:x)?(?:\?|$)'
        r'|\.jsp(?:\?|$)'
        r'|/cgi-bin'
        r'|^/\.htaccess'
        r'|^/\.htpasswd'
        r'|^/web\.config'
        r'|^/\.aws'
        r'|^/\.docker'
        r'|^/\.ssh'
        r'|^/\.bash_history'
        r'|^/\.npmrc'
        r'|^/\.pypirc'
        r'|/Dockerfile'
        r'|/docker-compose)',
        re.IGNORECASE,
    )

    BLOCKED_QUERY_PATTERN = re.compile(r'author=\d+', re.IGNORECASE)

    ALLOWED_PATHS = frozenset({
        '/.well-known/security.txt',
    })

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path_info

        if path in self.ALLOWED_PATHS:
            return self.get_response(request)

        if self.BLOCKED_PATH_PATTERN.search(path):
            self._log_blocked(request, path)
            raise Http404()

        query = request.META.get('QUERY_STRING', '')
        if query and self.BLOCKED_QUERY_PATTERN.search(query):
            self._log_blocked(request, f"{path}?{query}")
            raise Http404()

        return self.get_response(request)

    def _log_blocked(self, request, path):
        ip = self._get_ip(request)
        ua = request.META.get('HTTP_USER_AGENT', '')[:200]
        logger.warning("BLOCKED path=%s ip=%s ua=%s", path, ip, ua)

        try:
            from apps.accounts.audit import AuditLog
            AuditLog.objects.create(
                user=None,
                action='blocked_path',
                ip_address=ip,
                user_agent=ua[:500],
                details={
                    'path': path[:500],
                    'method': request.method,
                },
            )
        except Exception:
            pass

    @staticmethod
    def _get_ip(request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


class PermissionsPolicyMiddleware:
    """
    Adds Permissions-Policy header to restrict browser feature access.
    Disables camera, microphone, payment, geolocation, USB, and magnetometer
    to reduce the attack surface of the application.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['Permissions-Policy'] = (
            'camera=(), microphone=(), '
            'geolocation=(), usb=(), magnetometer=()'
        )
        return response
