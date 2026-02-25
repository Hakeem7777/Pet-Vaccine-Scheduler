"""
Views for user authentication and profile management.

All auth endpoints set JWT tokens as httpOnly cookies instead of
returning them in the response body, eliminating XSS token theft.
"""
import secrets
import string
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

import logging

from .models import PendingRegistration
from .throttles import AuthRateThrottle, OTPVerifyThrottle
from .serializers import (
    PendingRegistrationSerializer,
    OTPVerificationSerializer,
    ResendOTPSerializer,
    UserSerializer,
    PasswordChangeSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)
from apps.email_service.services import email_service
from .audit import log_audit

logger = logging.getLogger(__name__)

User = get_user_model()


# ── Cookie helpers ────────────────────────────────────────────────

ACCESS_TOKEN_MAX_AGE = int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
REFRESH_TOKEN_MAX_AGE = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())


def _set_auth_cookies(response, refresh: RefreshToken):
    """Set httpOnly JWT cookies on a response."""
    is_secure = not settings.DEBUG

    response.set_cookie(
        'access_token',
        str(refresh.access_token),
        httponly=True,
        secure=is_secure,
        samesite='Lax',
        max_age=ACCESS_TOKEN_MAX_AGE,
        path='/',
    )
    response.set_cookie(
        'refresh_token',
        str(refresh),
        httponly=True,
        secure=is_secure,
        samesite='Lax',
        max_age=REFRESH_TOKEN_MAX_AGE,
        path='/api/auth/',
    )


def _clear_auth_cookies(response):
    """Delete JWT cookies from a response."""
    response.delete_cookie('access_token', path='/')
    response.delete_cookie('refresh_token', path='/api/auth/')


# ── Auth Views ────────────────────────────────────────────────────

@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(APIView):
    """
    User registration endpoint - sends OTP for email verification.
    The actual user account is created only after OTP verification.

    POST /api/auth/register/
    """
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = PendingRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Generate OTP upfront so it's included in the initial insert
        otp = ''.join(secrets.choice(string.digits) for _ in range(6))
        otp_expires_at = timezone.now() + timedelta(hours=1)

        # Create or update pending registration (upsert by email)
        pending, _ = PendingRegistration.objects.update_or_create(
            email=data['email'],
            defaults={
                'username': data['username'],
                'password_hash': PendingRegistration.hash_password(data['password']),
                'first_name': data.get('first_name', ''),
                'last_name': data.get('last_name', ''),
                'clinic_name': data.get('clinic_name', ''),
                'phone': data.get('phone', ''),
                'otp': otp,
                'otp_expires_at': otp_expires_at,
            }
        )

        # Send OTP email
        if email_service:
            result = email_service.send_otp_email(
                data['email'], pending.otp, data['username']
            )
            if not result['success']:
                return Response(
                    {'detail': 'Failed to send verification email. Please try again.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
        else:
            return Response(
                {'detail': 'Email service is not configured.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({
            'message': 'Verification code sent to your email.',
            'email': data['email'],
        }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class VerifyOTPView(APIView):
    """
    Verify OTP and create user account.
    Sets JWT tokens as httpOnly cookies.

    POST /api/auth/verify-otp/
    """
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle, OTPVerifyThrottle]

    def post(self, request):
        serializer = OTPVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        otp = serializer.validated_data['otp']

        # Use uniform error to prevent email enumeration
        generic_error = {'detail': 'Invalid email or verification code.'}

        try:
            pending = PendingRegistration.objects.get(email=email)
        except PendingRegistration.DoesNotExist:
            return Response(generic_error, status=status.HTTP_400_BAD_REQUEST)

        # Check lockout from too many failed attempts
        if pending.is_otp_locked():
            return Response(
                {'detail': 'Too many failed attempts. Please try again later.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        if not pending.is_otp_valid(otp):
            pending.record_failed_otp_attempt()
            log_audit(request, 'otp_failed', details={'email': email})
            return Response(generic_error, status=status.HTTP_400_BAD_REQUEST)

        # OTP valid - reset attempts and create user
        pending.reset_otp_attempts()

        # Create the actual user with the pre-hashed password.
        user = User.objects.create(
            username=pending.username,
            email=User.objects.normalize_email(pending.email),
            password=pending.password_hash,
            first_name=pending.first_name,
            last_name=pending.last_name,
            clinic_name=pending.clinic_name,
            phone=pending.phone,
        )

        # Clean up pending registration
        pending.delete()

        log_audit(request, 'otp_verified', user=user, details={'email': email})

        # Generate JWT tokens and set as cookies
        refresh = RefreshToken.for_user(user)
        response = Response({
            'user': UserSerializer(user).data,
        }, status=status.HTTP_201_CREATED)
        _set_auth_cookies(response, refresh)
        return response


@method_decorator(csrf_exempt, name='dispatch')
class ResendOTPView(APIView):
    """
    Resend OTP for pending registration.

    POST /api/auth/resend-otp/
    """
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        # Always return success to prevent email enumeration
        generic_response = {
            'message': 'If a pending registration exists, a new code has been sent.',
        }

        try:
            pending = PendingRegistration.objects.get(email=email)
        except PendingRegistration.DoesNotExist:
            return Response(generic_response, status=status.HTTP_200_OK)

        pending.generate_otp()
        pending.save()

        if email_service:
            email_service.send_otp_email(email, pending.otp, pending.username)

        return Response(generic_response, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    """
    Email-based login endpoint.
    Sets JWT tokens as httpOnly cookies.

    POST /api/auth/login/
    """
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    @method_decorator(ensure_csrf_cookie)
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'detail': 'Email and password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, email=email, password=password)
        if user is not None:
            log_audit(request, 'login_success', user=user)
            refresh = RefreshToken.for_user(user)
            response = Response({
                'user': UserSerializer(user).data,
            })
            _set_auth_cookies(response, refresh)
            return response

        log_audit(request, 'login_failed', details={'email': email})
        return Response(
            {'detail': 'Invalid email or password.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Get or update current user profile.

    GET /api/auth/me/
    PUT /api/auth/me/
    PATCH /api/auth/me/
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class PasswordChangeView(APIView):
    """
    Change user password and invalidate all existing sessions.

    POST /api/auth/password/change/
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()

        # Invalidate all existing refresh tokens for this user
        from rest_framework_simplejwt.token_blacklist.models import (
            OutstandingToken, BlacklistedToken,
        )
        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)

        log_audit(request, 'password_changed', user=user)

        # Issue fresh tokens so the user stays logged in
        refresh = RefreshToken.for_user(user)
        response = Response({
            'message': 'Password changed successfully.'
        }, status=status.HTTP_200_OK)
        _set_auth_cookies(response, refresh)
        return response


class LogoutView(APIView):
    """
    Logout by blacklisting the refresh token from the cookie.

    POST /api/auth/logout/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        log_audit(request, 'logout')
        response = Response({
            'message': 'Successfully logged out.'
        }, status=status.HTTP_200_OK)

        try:
            refresh_token = request.COOKIES.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                # Validate token belongs to the requesting user
                if token.get('user_id') == request.user.id:
                    token.blacklist()
                else:
                    logger.warning(
                        f"Logout: token user_id mismatch "
                        f"(token={token.get('user_id')}, request={request.user.id})"
                    )
        except (TokenError, ValueError) as e:
            logger.warning(f"Logout failed - invalid token: {e}")

        _clear_auth_cookies(response)
        return response


@method_decorator(csrf_exempt, name='dispatch')
class CookieTokenRefreshView(APIView):
    """
    Refresh the access token using the refresh token from httpOnly cookie.
    Sets new tokens as httpOnly cookies.

    POST /api/auth/refresh/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')
        if not refresh_token:
            return Response(
                {'detail': 'No refresh token.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            old_refresh = RefreshToken(refresh_token)
            # Rotation: create new refresh token and blacklist old one
            new_refresh = RefreshToken.for_user(
                User.objects.get(id=old_refresh['user_id'])
            )
            old_refresh.blacklist()

            response = Response({'detail': 'Token refreshed.'})
            _set_auth_cookies(response, new_refresh)
            return response

        except (TokenError, ValueError, User.DoesNotExist) as e:
            logger.warning(f"Token refresh failed: {e}")
            response = Response(
                {'detail': 'Invalid or expired refresh token.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            _clear_auth_cookies(response)
            return response


# ── Password Reset Views ─────────────────────────────────────────

@method_decorator(csrf_exempt, name='dispatch')
class PasswordResetRequestView(APIView):
    """
    Request a password reset email.
    Always returns success to prevent email enumeration.

    POST /api/auth/password/reset/
    """
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        # Always return success to prevent email enumeration
        generic_response = {
            'message': 'If an account exists with that email, a reset link has been sent.',
        }

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(generic_response, status=status.HTTP_200_OK)

        # Generate reset token
        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        # Build reset URL (frontend route)
        frontend_url = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else request.build_absolute_uri('/')[:-1]
        reset_url = f"{frontend_url}/reset-password?uid={uidb64}&token={token}"

        # Send email
        if email_service:
            email_service.send_password_reset_email(
                to_email=email,
                username=user.username,
                reset_url=reset_url,
            )

        log_audit(request, 'password_reset_requested', details={'email': email})
        return Response(generic_response, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class PasswordResetConfirmView(APIView):
    """
    Confirm password reset with token and set new password.

    POST /api/auth/password/reset/confirm/
    """
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uidb64 = serializer.validated_data['uidb64']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {'detail': 'Invalid reset link.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {'detail': 'Reset link has expired or is invalid.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()

        # Invalidate all existing sessions
        from rest_framework_simplejwt.token_blacklist.models import (
            OutstandingToken, BlacklistedToken,
        )
        for outstanding in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=outstanding)

        log_audit(request, 'password_reset_confirmed', user=user)
        return Response(
            {'message': 'Password has been reset successfully. You can now log in.'},
            status=status.HTTP_200_OK,
        )
