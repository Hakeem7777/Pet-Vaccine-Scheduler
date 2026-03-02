from rest_framework import serializers

from apps.storage import get_file_url
from .models import HelpVideo


class HelpVideoAdminSerializer(serializers.ModelSerializer):
    author_email = serializers.CharField(source='author.email', read_only=True)
    thumbnail_url = serializers.SerializerMethodField()
    video_file_url = serializers.SerializerMethodField()

    class Meta:
        model = HelpVideo
        fields = [
            'id', 'title', 'slug', 'description',
            'video_file', 'video_file_url', 'video_url',
            'thumbnail', 'thumbnail_url',
            'author', 'author_email', 'status', 'ordering',
            'published_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['slug', 'author', 'published_at', 'created_at', 'updated_at']

    def get_thumbnail_url(self, obj):
        return get_file_url(obj.thumbnail, self.context.get('request'))

    def get_video_file_url(self, obj):
        return get_file_url(obj.video_file, self.context.get('request'))


class HelpVideoListSerializer(serializers.ModelSerializer):
    author_email = serializers.CharField(source='author.email', read_only=True)
    thumbnail_url = serializers.SerializerMethodField()
    has_video_file = serializers.SerializerMethodField()

    class Meta:
        model = HelpVideo
        fields = [
            'id', 'title', 'slug', 'description', 'thumbnail_url',
            'video_url', 'has_video_file',
            'author_email', 'status', 'ordering',
            'published_at', 'created_at',
        ]

    def get_thumbnail_url(self, obj):
        return get_file_url(obj.thumbnail, self.context.get('request'))

    def get_has_video_file(self, obj):
        return bool(obj.video_file)


class HelpVideoPublicSerializer(serializers.ModelSerializer):
    thumbnail_url = serializers.SerializerMethodField()
    video_file_url = serializers.SerializerMethodField()

    class Meta:
        model = HelpVideo
        fields = [
            'id', 'title', 'slug', 'description',
            'video_file_url', 'video_url', 'thumbnail_url',
            'published_at',
        ]

    def get_thumbnail_url(self, obj):
        return get_file_url(obj.thumbnail, self.context.get('request'))

    def get_video_file_url(self, obj):
        return get_file_url(obj.video_file, self.context.get('request'))


class HelpVideoPublicListSerializer(serializers.ModelSerializer):
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = HelpVideo
        fields = [
            'id', 'title', 'slug', 'description',
            'thumbnail_url', 'published_at',
        ]

    def get_thumbnail_url(self, obj):
        return get_file_url(obj.thumbnail, self.context.get('request'))
