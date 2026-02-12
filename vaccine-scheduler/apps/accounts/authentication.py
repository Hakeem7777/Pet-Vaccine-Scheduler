"""
Cookie-based JWT authentication for httpOnly cookie tokens.

Reads JWT access token from httpOnly cookie instead of Authorization header,
eliminating XSS token theft via localStorage.
"""
from django.middleware.csrf import CsrfViewMiddleware
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """
    JWT authentication that reads the access token from an httpOnly cookie.

    For unsafe HTTP methods (POST, PUT, PATCH, DELETE), CSRF validation
    is enforced since cookies are sent automatically by the browser.
    """

    def authenticate(self, request):
        raw_token = request.COOKIES.get('access_token')
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)

        # Enforce CSRF for state-changing requests (cookies are auto-sent)
        if request.method not in ('GET', 'HEAD', 'OPTIONS', 'TRACE'):
            self._enforce_csrf(request)

        return user, validated_token

    @staticmethod
    def _enforce_csrf(request):
        """Run Django's CSRF check for cookie-authenticated requests."""
        reason = CsrfViewMiddleware(lambda req: None).process_view(request, None, (), {})
        if reason:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(f'CSRF validation failed: {reason}')
