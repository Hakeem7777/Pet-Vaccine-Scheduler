from django.contrib import admin
from .models import BlogPost, BlogMedia


@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'status', 'published_at', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['title', 'author__email']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ['created_at', 'updated_at']


@admin.register(BlogMedia)
class BlogMediaAdmin(admin.ModelAdmin):
    list_display = ['file', 'uploaded_by', 'created_at']
    readonly_fields = ['file', 'uploaded_by', 'created_at']
