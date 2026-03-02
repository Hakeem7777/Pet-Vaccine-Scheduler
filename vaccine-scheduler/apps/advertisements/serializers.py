from rest_framework import serializers

from apps.storage import get_file_url
from .models import Advertisement


class AdvertisementAdminSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Advertisement
        fields = [
            'id', 'title', 'image', 'image_url', 'link_url',
            'position', 'is_active', 'start_date', 'end_date',
            'order', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_image_url(self, obj):
        return get_file_url(obj.image, self.context.get('request'))


class AdvertisementPublicSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Advertisement
        fields = ['id', 'image_url', 'link_url', 'position']

    def get_image_url(self, obj):
        return get_file_url(obj.image, self.context.get('request'))
