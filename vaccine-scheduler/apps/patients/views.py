"""
Views for patient (dog) management.
"""
import io
import zipfile

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes as perm_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.subscriptions.permissions import HasActiveSubscription
from apps.vaccinations.models import VaccinationRecord
from .models import Dog, DogDocument
from .serializers import (
    DogSerializer, DogCreateSerializer, DogDetailSerializer,
    DogDocumentSerializer, DogDocumentUploadSerializer,
)


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


class DogDocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing documents for a specific dog.

    Endpoints:
    - GET    /api/dogs/{dog_id}/documents/      - List documents
    - POST   /api/dogs/{dog_id}/documents/      - Upload document
    - GET    /api/dogs/{dog_id}/documents/{id}/  - Get document detail
    - DELETE /api/dogs/{dog_id}/documents/{id}/  - Delete document
    """
    permission_classes = [IsAuthenticated, HasActiveSubscription]
    parser_classes = [MultiPartParser, FormParser]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_dog(self):
        dog_id = self.kwargs.get('dog_id')
        return get_object_or_404(
            Dog.objects.filter(owner=self.request.user),
            pk=dog_id
        )

    def get_queryset(self):
        dog = self.get_dog()
        return DogDocument.objects.filter(dog=dog)

    def get_serializer_class(self):
        if self.action == 'create':
            return DogDocumentUploadSerializer
        return DogDocumentSerializer

    def create(self, request, *args, **kwargs):
        dog = self.get_dog()

        # Enforce 10-document limit
        current_count = DogDocument.objects.filter(dog=dog).count()
        if current_count >= 10:
            return Response(
                {'error': 'Maximum of 10 documents per dog reached.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uploaded_file = serializer.validated_data['document']
        doc = DogDocument.objects.create(
            dog=dog,
            file=uploaded_file,
            original_filename=uploaded_file.name[:255],
            file_size=uploaded_file.size,
            content_type=getattr(uploaded_file, 'content_type', 'application/octet-stream'),
        )

        output_serializer = DogDocumentSerializer(doc)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        revert = request.query_params.get('revert_extraction', '').lower() == 'true'

        if revert and instance.has_extraction_data:
            dog = instance.dog
            ext = instance.extraction_data

            # Revert dog fields to their previous values
            previous = ext.get('previous_fields', {})
            if previous:
                for field, old_value in previous.items():
                    if hasattr(dog, field):
                        setattr(dog, field, old_value)
                dog.save()

            # Delete vaccination records that were added from this document
            vax_ids = ext.get('vaccination_record_ids', [])
            if vax_ids:
                VaccinationRecord.objects.filter(
                    id__in=vax_ids, dog=dog
                ).delete()

        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@perm_classes([IsAuthenticated, HasActiveSubscription])
def download_all_documents(request, dog_id):
    """Stream a zip of all documents for a dog."""
    dog = get_object_or_404(Dog.objects.filter(owner=request.user), pk=dog_id)
    docs = DogDocument.objects.filter(dog=dog)

    if not docs.exists():
        return Response({'error': 'No documents to download.'}, status=status.HTTP_404_NOT_FOUND)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        seen_names = {}
        for doc in docs:
            try:
                data = doc.file.read()
                # Deduplicate filenames within the zip
                name = doc.original_filename
                if name in seen_names:
                    seen_names[name] += 1
                    base, _, ext = name.rpartition('.')
                    name = f'{base}_{seen_names[name]}.{ext}' if ext else f'{name}_{seen_names[name]}'
                else:
                    seen_names[name] = 0
                zf.writestr(name, data)
            except Exception:
                continue

    buf.seek(0)
    response = HttpResponse(buf.read(), content_type='application/zip')
    response['Content-Disposition'] = f'attachment; filename="documents-{dog.name}.zip"'
    return response
