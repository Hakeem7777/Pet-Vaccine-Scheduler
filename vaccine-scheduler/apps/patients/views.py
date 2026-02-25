"""
Views for patient (dog) management.
"""
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Dog
from .serializers import DogSerializer, DogCreateSerializer, DogDetailSerializer


class DogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing dogs (patients).

    Endpoints:
    - GET /api/dogs/ - List all dogs for current user
    - POST /api/dogs/ - Create a new dog
    - GET /api/dogs/{id}/ - Get dog details
    - PUT /api/dogs/{id}/ - Update dog
    - PATCH /api/dogs/{id}/ - Partial update dog
    - DELETE /api/dogs/{id}/ - Delete dog
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter dogs to only show those owned by the current user."""
        return Dog.objects.filter(owner=self.request.user).prefetch_related(
            'vaccination_records', 'vaccination_records__vaccine'
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action in ('create', 'update', 'partial_update'):
            return DogCreateSerializer
        elif self.action == 'retrieve':
            return DogDetailSerializer
        return DogSerializer

    def perform_create(self, serializer):
        """Set the owner to the current user when creating a dog."""
        serializer.save(owner=self.request.user)

    def create(self, request, *args, **kwargs):
        """Create a new dog and return full details. Enforces subscription dog limits."""
        # Check dog limit based on subscription
        current_count = Dog.objects.filter(owner=request.user).count()
        dog_limit = self._get_dog_limit(request.user)

        if dog_limit is not None and current_count >= dog_limit:
            return Response(
                {
                    'error': 'Dog limit reached for your subscription plan.',
                    'current_count': current_count,
                    'limit': dog_limit,
                    'upgrade_required': True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        # Return the created dog with full details
        dog = Dog.objects.get(pk=serializer.instance.pk)
        output_serializer = DogSerializer(dog)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    def _get_dog_limit(self, user):
        """Return dog limit based on user's subscription. None means unlimited."""
        try:
            sub = user.subscription
            if sub.is_active:
                return sub.dog_limit
        except Exception:
            pass
        # No active subscription - free tier limit
        return 1
