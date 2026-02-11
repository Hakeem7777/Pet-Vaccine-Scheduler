"""
Rate limiting for AI endpoints.
"""
from rest_framework.throttling import UserRateThrottle


class AIRateThrottle(UserRateThrottle):
    """Rate limit for AI/LLM endpoints to prevent API cost abuse."""
    scope = 'ai'
