from django.urls import path
from .views import (
    AdminBlogPostListCreateView,
    AdminBlogPostDetailView,
    AdminBlogMediaUploadView,
    PublicBlogPostListView,
    PublicBlogPostDetailView,
)

app_name = 'blog'

urlpatterns = [
    # Admin endpoints
    path('admin-panel/blogs/', AdminBlogPostListCreateView.as_view(), name='admin-blog-list-create'),
    path('admin-panel/blogs/<int:pk>/', AdminBlogPostDetailView.as_view(), name='admin-blog-detail'),
    path('admin-panel/blogs/upload-media/', AdminBlogMediaUploadView.as_view(), name='admin-blog-upload-media'),

    # Public endpoints
    path('blogs/', PublicBlogPostListView.as_view(), name='public-blog-list'),
    path('blogs/<slug:slug>/', PublicBlogPostDetailView.as_view(), name='public-blog-detail'),
]
