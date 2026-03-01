import logging

from rest_framework import status
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.dashboard.permissions import IsAdminUser
from .models import BlogPost, BlogMedia
from .serializers import (
    BlogPostAdminSerializer,
    BlogPostListSerializer,
    BlogPostPublicSerializer,
    BlogPostPublicListSerializer,
    BlogMediaSerializer,
)

logger = logging.getLogger(__name__)


# ── Admin Views ──────────────────────────────────────────────────

class AdminBlogPostListCreateView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        queryset = BlogPost.objects.select_related('author').all()

        search = request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(title__icontains=search)

        status_filter = request.query_params.get('status', '')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        ordering = request.query_params.get('ordering', '-created_at')
        allowed_orderings = [
            'created_at', '-created_at', 'title', '-title',
            'published_at', '-published_at',
        ]
        if ordering in allowed_orderings:
            queryset = queryset.order_by(ordering)

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(queryset, request)
        serializer = BlogPostListSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = BlogPostAdminSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        save_kwargs = {'author': request.user}
        if not request.data.get('author_display_name'):
            save_kwargs['author_display_name'] = request.user.username
        serializer.save(**save_kwargs)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminBlogPostDetailView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get_post(self, pk):
        try:
            return BlogPost.objects.select_related('author').get(pk=pk)
        except BlogPost.DoesNotExist:
            return None

    def get(self, request, pk):
        post = self._get_post(pk)
        if not post:
            return Response({'detail': 'Blog post not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = BlogPostAdminSerializer(post, context={'request': request})
        return Response(serializer.data)

    def put(self, request, pk):
        post = self._get_post(pk)
        if not post:
            return Response({'detail': 'Blog post not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = BlogPostAdminSerializer(
            post, data=request.data, partial=True, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        post = self._get_post(pk)
        if not post:
            return Response({'detail': 'Blog post not found.'}, status=status.HTTP_404_NOT_FOUND)
        post.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminBlogMediaUploadView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    ALLOWED_TYPES = {
        'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        'video': ['video/mp4', 'video/webm', 'video/ogg'],
        'audio': ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp3'],
    }
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        if file.size > self.MAX_FILE_SIZE:
            return Response(
                {'error': 'File too large. Maximum size is 50MB.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content_type = file.content_type
        all_allowed = []
        for types in self.ALLOWED_TYPES.values():
            all_allowed.extend(types)

        if content_type not in all_allowed:
            return Response(
                {'error': f'Unsupported file type: {content_type}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        media = BlogMedia.objects.create(file=file, uploaded_by=request.user)
        serializer = BlogMediaSerializer(media, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ── Public Views ─────────────────────────────────────────────────

class PublicBlogPostListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = BlogPostPublicListSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['title', 'excerpt']
    ordering_fields = ['published_at']
    ordering = ['-published_at']

    def get_queryset(self):
        return BlogPost.objects.filter(
            status='published',
            published_at__isnull=False,
        ).select_related('author')


class PublicBlogPostDetailView(RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = BlogPostPublicSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        return BlogPost.objects.filter(
            status='published',
            published_at__isnull=False,
        ).select_related('author')
