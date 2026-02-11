"""
Views for user authentication and profile management.
"""
import random
import string
from datetime import timedelta

from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone
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
)
from apps.email_service.services import email_service

logger = logging.getLogger(__name__)

User = get_user_model()


class RegisterView(APIView):
    """
    User registration endpoint — sends OTP for email verification.
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
        otp = ''.join(random.choices(string.digits, k=6))
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


class VerifyOTPView(APIView):
    """
    Verify OTP and create user account.

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
            return Response(generic_error, status=status.HTTP_400_BAD_REQUEST)

        # OTP valid — reset attempts and create user
        pending.reset_otp_attempts()

        # Create the actual user with the pre-hashed password.
        # pending.password_hash is already a valid Django hash from make_password(),
        # so assigning directly to `password` is correct — Django stores it as-is.
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

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        }, status=status.HTTP_201_CREATED)


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


class LoginView(APIView):
    """
    Email-based login endpoint.

    POST /api/auth/login/
    """
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

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
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            })

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
    Change user password.

    POST /api/auth/password/change/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response({
            'message': 'Password changed successfully.'
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    Logout by blacklisting the refresh token.

    POST /api/auth/logout/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({
                'message': 'Successfully logged out.'
            }, status=status.HTTP_200_OK)
        except (TokenError, ValueError) as e:
            logger.warning(f"Logout failed - invalid token: {e}")
            return Response({
                'error': 'Invalid token.'
            }, status=status.HTTP_400_BAD_REQUEST)
