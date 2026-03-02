"""
Views for patient (dog) management.
"""
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Dog
from .serializers import DogSerializer, DogCreateSerializer, DogDetailSerializer


def get_visible_dogs_queryset(user):
    """
    Return dogs visible to this user based on subscription status.
    Active subscription: all dogs. Free/cancelled/expired: newest dog only.
    Dogs are never deleted, just filtered from API responses.
    """
    all_dogs = Dog.objects.filter(owner=user)

    has_active_sub = False
    try:
        has_active_sub = user.subscription.is_active
    except Exception:
        pass

    if has_active_sub:
        return all_dogs

    newest_dog_id = all_dogs.order_by('-created_at').values('id')[:1]
    return all_dogs.filter(id__in=newest_dog_id)


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
        """Filter dogs to only show those visible to the current user."""
        return get_visible_dogs_queryset(self.request.user).prefetch_related(
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
