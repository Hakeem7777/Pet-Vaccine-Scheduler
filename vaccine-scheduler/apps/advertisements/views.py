from django.utils import timezone
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.dashboard.permissions import IsAdminUser
from .models import Advertisement
from .serializers import AdvertisementAdminSerializer, AdvertisementPublicSerializer


# ── Admin Views ──────────────────────────────────────────────────

class AdminAdvertisementListCreateView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        queryset = Advertisement.objects.all()

        search = request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(title__icontains=search)

        position = request.query_params.get('position', '')
        if position:
            queryset = queryset.filter(position=position)

        is_active = request.query_params.get('is_active', '')
        if is_active:
            queryset = queryset.filter(is_active=is_active.lower() in ('true', '1'))

        serializer = AdvertisementAdminSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        serializer = AdvertisementAdminSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminAdvertisementDetailView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get_ad(self, pk):
        try:
            return Advertisement.objects.get(pk=pk)
        except Advertisement.DoesNotExist:
            return None

    def get(self, request, pk):
        ad = self._get_ad(pk)
        if not ad:
            return Response({'detail': 'Advertisement not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdvertisementAdminSerializer(ad, context={'request': request})
        return Response(serializer.data)

    def put(self, request, pk):
        ad = self._get_ad(pk)
        if not ad:
            return Response({'detail': 'Advertisement not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdvertisementAdminSerializer(
            ad, data=request.data, partial=True, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        ad = self._get_ad(pk)
        if not ad:
            return Response({'detail': 'Advertisement not found.'}, status=status.HTTP_404_NOT_FOUND)
        ad.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Public Views ─────────────────────────────────────────────────

class ActiveAdvertisementListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = AdvertisementPublicSerializer
    pagination_class = None

    def get_queryset(self):
        now = timezone.now()
        queryset = Advertisement.objects.filter(is_active=True)
        queryset = queryset.exclude(start_date__gt=now)
        queryset = queryset.exclude(end_date__lt=now)
        return queryset.order_by('position', 'order')
