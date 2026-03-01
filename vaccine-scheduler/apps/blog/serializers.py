from rest_framework import serializers
from .models import BlogPost, BlogMedia


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
        if obj.featured_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.featured_image.url)
            return obj.featured_image.url
        return None


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
        if obj.featured_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.featured_image.url)
            return obj.featured_image.url
        return None


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
        if obj.featured_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.featured_image.url)
            return obj.featured_image.url
        return None


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
        if obj.featured_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.featured_image.url)
            return obj.featured_image.url
        return None


class BlogMediaSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = BlogMedia
        fields = ['id', 'file', 'url', 'created_at']
        read_only_fields = ['created_at']

    def get_url(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url
