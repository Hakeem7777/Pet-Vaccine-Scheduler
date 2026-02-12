"""
Custom security middleware.
"""


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
            'camera=(), microphone=(), payment=(), '
            'geolocation=(), usb=(), magnetometer=()'
        )
        return response
