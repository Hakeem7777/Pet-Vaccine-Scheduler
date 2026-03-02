from django.contrib import admin
from .models import HelpVideo


@admin.register(HelpVideo)
class HelpVideoAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'status', 'ordering', 'published_at', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['title', 'author__email']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ['created_at', 'updated_at']
    list_editable = ['ordering']
