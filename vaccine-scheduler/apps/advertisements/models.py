from django.conf import settings
from django.db import models

from apps.storage.validators import validate_image_file


class Advertisement(models.Model):
    POSITION_CHOICES = [
        ('top', 'Top Banner'),
        ('bottom', 'Bottom Banner'),
        ('left', 'Left Sidebar'),
        ('right', 'Right Sidebar'),
    ]

    title = models.CharField(max_length=255, help_text='Admin label for identification')
    image = models.ImageField(upload_to='ads/', validators=[validate_image_file])
    link_url = models.URLField(blank=True, help_text='URL to open when ad is clicked')
    position = models.CharField(max_length=10, choices=POSITION_CHOICES)
    is_active = models.BooleanField(default=True)
    start_date = models.DateTimeField(blank=True, null=True, help_text='Optional start date')
    end_date = models.DateTimeField(blank=True, null=True, help_text='Optional end date')
    order = models.PositiveIntegerField(default=0, help_text='Lower numbers appear first')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'advertisements'
        ordering = ['order', '-created_at']
        indexes = [
            models.Index(fields=['position', 'is_active']),
        ]

    def __str__(self):
        return f'{self.title} ({self.get_position_display()})'


class AdClick(models.Model):
    advertisement = models.ForeignKey(Advertisement, on_delete=models.CASCADE, related_name='clicks')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    clicked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ad_clicks'
        indexes = [
            models.Index(fields=['advertisement', 'clicked_at']),
        ]

    def __str__(self):
        return f'Click on {self.advertisement.title} at {self.clicked_at}'
