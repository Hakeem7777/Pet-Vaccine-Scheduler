from django.contrib import admin
from django.db.models import Count
from .models import Advertisement, AdClick


@admin.register(Advertisement)
class AdvertisementAdmin(admin.ModelAdmin):
    list_display = ['title', 'position', 'is_active', 'order', 'total_clicks', 'start_date', 'end_date', 'created_at']
    list_filter = ['position', 'is_active']
    search_fields = ['title']
    list_editable = ['is_active', 'order']
    readonly_fields = ['created_at', 'updated_at']

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(click_count=Count('clicks'))

    def total_clicks(self, obj):
        return obj.click_count
    total_clicks.admin_order_field = 'click_count'


@admin.register(AdClick)
class AdClickAdmin(admin.ModelAdmin):
    list_display = ['advertisement', 'user', 'ip_address', 'clicked_at']
    list_filter = ['clicked_at', 'advertisement']
    readonly_fields = ['advertisement', 'user', 'ip_address', 'clicked_at']
