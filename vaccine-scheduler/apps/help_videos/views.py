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
from .models import HelpVideo
from .serializers import (
    HelpVideoAdminSerializer,
    HelpVideoListSerializer,
    HelpVideoPublicSerializer,
    HelpVideoPublicListSerializer,
)

logger = logging.getLogger(__name__)


# ── Admin Views ──────────────────────────────────────────────────

class AdminHelpVideoListCreateView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        queryset = HelpVideo.objects.select_related('author').all()

        search = request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(title__icontains=search)

        status_filter = request.query_params.get('status', '')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        ordering = request.query_params.get('ordering', '-created_at')
        allowed_orderings = [
            'created_at', '-created_at', 'title', '-title',
            'published_at', '-published_at', 'ordering', '-ordering',
        ]
        if ordering in allowed_orderings:
            queryset = queryset.order_by(ordering)

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(queryset, request)
        serializer = HelpVideoListSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = HelpVideoAdminSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save(author=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminHelpVideoDetailView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get_video(self, pk):
        try:
            return HelpVideo.objects.select_related('author').get(pk=pk)
        except HelpVideo.DoesNotExist:
            return None

    def get(self, request, pk):
        video = self._get_video(pk)
        if not video:
            return Response({'detail': 'Help video not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = HelpVideoAdminSerializer(video, context={'request': request})
        return Response(serializer.data)

    def put(self, request, pk):
        video = self._get_video(pk)
        if not video:
            return Response({'detail': 'Help video not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = HelpVideoAdminSerializer(
            video, data=request.data, partial=True, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        video = self._get_video(pk)
        if not video:
            return Response({'detail': 'Help video not found.'}, status=status.HTTP_404_NOT_FOUND)
        video.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Public Views ─────────────────────────────────────────────────

class PublicHelpVideoListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = HelpVideoPublicListSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['published_at', 'ordering']
    ordering = ['ordering', '-published_at']

    def get_queryset(self):
        return HelpVideo.objects.filter(
            status='published',
            published_at__isnull=False,
        )


class PublicHelpVideoDetailView(RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = HelpVideoPublicSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        return HelpVideo.objects.filter(
            status='published',
            published_at__isnull=False,
        )
