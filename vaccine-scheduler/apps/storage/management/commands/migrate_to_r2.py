"""
Management command to migrate existing local media files to Cloudflare R2.

Usage:
    python manage.py migrate_to_r2           # Dry run
    python manage.py migrate_to_r2 --execute  # Actually migrate
"""
import os

from django.conf import settings
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand

from apps.patients.models import Dog
from apps.blog.models import BlogPost, BlogMedia
from apps.advertisements.models import Advertisement


class Command(BaseCommand):
    help = 'Migrate local media files to Cloudflare R2 storage'

    def add_arguments(self, parser):
        parser.add_argument(
            '--execute',
            action='store_true',
            help='Actually perform the migration (default is dry run)',
        )

    def handle(self, *args, **options):
        execute = options['execute']
        media_root = str(settings.MEDIA_ROOT)

        if not execute:
            self.stdout.write(self.style.WARNING('DRY RUN — no files will be moved'))

        models_fields = [
            (Dog, 'image'),
            (BlogPost, 'featured_image'),
            (BlogMedia, 'file'),
            (Advertisement, 'image'),
        ]

        total = 0
        migrated = 0

        for model_class, field_name in models_fields:
            queryset = model_class.objects.exclude(
                **{f'{field_name}__exact': ''}
            ).exclude(
                **{f'{field_name}__isnull': True}
            )

            for obj in queryset:
                file_field = getattr(obj, field_name)
                if not file_field or not file_field.name:
                    continue

                total += 1
                local_path = os.path.join(media_root, file_field.name)

                if not os.path.exists(local_path):
                    self.stdout.write(self.style.WARNING(
                        f'  SKIP {model_class.__name__}#{obj.pk}: '
                        f'local file not found: {local_path}'
                    ))
                    continue

                if execute:
                    try:
                        with open(local_path, 'rb') as f:
                            default_storage.save(file_field.name, f)
                        migrated += 1
                        self.stdout.write(self.style.SUCCESS(
                            f'  OK {model_class.__name__}#{obj.pk}: {file_field.name}'
                        ))
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(
                            f'  FAIL {model_class.__name__}#{obj.pk}: {e}'
                        ))
                else:
                    self.stdout.write(
                        f'  WOULD migrate {model_class.__name__}#{obj.pk}: '
                        f'{file_field.name}'
                    )
                    migrated += 1

        action = 'Migrated' if execute else 'Would migrate'
        self.stdout.write(self.style.SUCCESS(
            f'\n{action} {migrated}/{total} files'
        ))
