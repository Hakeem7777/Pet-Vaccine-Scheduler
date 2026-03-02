from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from apps.storage.validators import validate_image_file, validate_video_file


class HelpVideo(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
    ]

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=270, unique=True, blank=True)
    description = models.TextField(
        max_length=500,
        blank=True,
        help_text='Short summary for listing cards',
    )
    video_file = models.FileField(
        upload_to='help_videos/',
        blank=True,
        null=True,
        validators=[validate_video_file],
        help_text='Upload MP4/WebM/Ogg video file (stored in R2)',
    )
    video_url = models.URLField(
        blank=True,
        help_text='YouTube or external video URL',
    )
    thumbnail = models.ImageField(
        upload_to='help_videos/thumbnails/',
        blank=True,
        null=True,
        validators=[validate_image_file],
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='help_videos',
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='draft',
    )
    published_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    ordering = models.PositiveIntegerField(default=0, help_text='Lower numbers appear first')

    class Meta:
        db_table = 'help_videos'
        ordering = ['ordering', '-published_at', '-created_at']
        indexes = [
            models.Index(fields=['status', '-published_at']),
            models.Index(fields=['slug']),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while HelpVideo.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base_slug}-{counter}'
                counter += 1
            self.slug = slug
        if self.status == 'published' and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)
