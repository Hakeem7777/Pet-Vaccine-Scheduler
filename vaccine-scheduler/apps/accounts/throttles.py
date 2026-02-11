"""
Rate limiting for authentication endpoints.
"""
from rest_framework.throttling import AnonRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """Strict rate limit for auth endpoints (login, register, OTP)."""
    scope = 'auth'


class OTPVerifyThrottle(AnonRateThrottle):
    """Strict rate limit specifically for OTP verification attempts."""
    scope = 'otp_verify'
