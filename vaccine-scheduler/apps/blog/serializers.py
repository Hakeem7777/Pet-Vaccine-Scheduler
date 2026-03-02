import re

from django.core.files.storage import default_storage
from rest_framework import serializers

from apps.storage import get_file_url
from .models import BlogPost, BlogMedia

# Pattern to match /media/blog/media/... URLs in HTML content
_MEDIA_URL_RE = re.compile(r'(?:https?://[^/]+)?/media/(blog/media/[^\s"\'<>]+)')


def _rewrite_content_media_urls(html):
    """
    Replace /media/blog/media/... references in HTML with fresh storage URLs.
    For R2 this produces signed URLs; for local storage it's a no-op passthrough.
    """
    if not html:
        return html

    def _replace(match):
        relative_path = match.group(1)
        try:
            return default_storage.url(relative_path)
        except Exception:
            return match.group(0)

    return _MEDIA_URL_RE.sub(_replace, html)


class BlogPostAdminSerializer(serializers.ModelSerializer):
    author_email = serializers.CharField(source='author.email', read_only=True)
    featured_image_url = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'slug', 'excerpt', 'content',
            'featured_image', 'featured_image_url',
            'author', 'author_email', 'author_display_name', 'status',
            'published_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['slug', 'author', 'published_at', 'created_at', 'updated_at']

    def get_featured_image_url(self, obj):
        return get_file_url(obj.featured_image, self.context.get('request'))

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['content'] = _rewrite_content_media_urls(data.get('content'))
        return data


class BlogPostListSerializer(serializers.ModelSerializer):
    author_email = serializers.CharField(source='author.email', read_only=True)
    featured_image_url = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'slug', 'excerpt', 'featured_image_url',
            'author_email', 'status', 'published_at', 'created_at',
        ]

    def get_featured_image_url(self, obj):
        return get_file_url(obj.featured_image, self.context.get('request'))


class BlogPostPublicSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    featured_image_url = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'slug', 'excerpt', 'content',
            'featured_image_url', 'author_name', 'published_at',
        ]

    def get_author_name(self, obj):
        if obj.author_display_name:
            return obj.author_display_name
        if obj.author.first_name:
            return f'{obj.author.first_name} {obj.author.last_name}'.strip()
        return obj.author.username

    def get_featured_image_url(self, obj):
        return get_file_url(obj.featured_image, self.context.get('request'))

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['content'] = _rewrite_content_media_urls(data.get('content'))
        return data


class BlogPostPublicListSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    featured_image_url = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'slug', 'excerpt',
            'featured_image_url', 'author_name', 'published_at',
        ]

    def get_author_name(self, obj):
        if obj.author_display_name:
            return obj.author_display_name
        if obj.author.first_name:
            return f'{obj.author.first_name} {obj.author.last_name}'.strip()
        return obj.author.username

    def get_featured_image_url(self, obj):
        return get_file_url(obj.featured_image, self.context.get('request'))


class BlogMediaSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = BlogMedia
        fields = ['id', 'file', 'url', 'created_at']
        read_only_fields = ['created_at']

    def get_url(self, obj):
        return get_file_url(obj.file, self.context.get('request'))
