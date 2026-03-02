import hashlib
import logging

from django.conf import settings
from django.core.files.base import ContentFile
from storages.backends.s3boto3 import S3Boto3Storage

logger = logging.getLogger(__name__)


def compute_file_hash(file_obj):
    """Compute SHA-256 hash of an uploaded file without consuming it."""
    hasher = hashlib.sha256()
    # Save current position
    pos = file_obj.tell()
    file_obj.seek(0)
    for chunk in file_obj.chunks(chunk_size=8192):
        hasher.update(chunk)
    # Reset to original position so Django can still read the file
    file_obj.seek(pos)
    return hasher.hexdigest()


class R2MediaStorage(S3Boto3Storage):
    """
    Cloudflare R2 storage backend for media files.
    Generates presigned URLs for reading objects.
    Deduplicates uploads using SHA-256 hashes.
    """

    file_overwrite = False
    default_acl = None
    signature_version = 's3v4'
    addressing_style = 'path'

    def __init__(self, **kwargs):
        kwargs.setdefault('access_key', getattr(settings, 'R2_ACCESS_KEY_ID', ''))
        kwargs.setdefault('secret_key', getattr(settings, 'R2_SECRET_ACCESS_KEY', ''))
        kwargs.setdefault('bucket_name', getattr(settings, 'R2_BUCKET_NAME', ''))
        kwargs.setdefault('endpoint_url', getattr(settings, 'R2_ENDPOINT_URL', ''))
        kwargs.setdefault('region_name', 'auto')
        kwargs.setdefault('custom_domain', None)
        kwargs.setdefault('querystring_auth', True)
        kwargs.setdefault('querystring_expire', getattr(
            settings, 'R2_SIGNED_URL_EXPIRY', 600
        ))
        super().__init__(**kwargs)

    def _save(self, name, content):
        """
        Override _save to deduplicate files by hash.
        If a file with the same hash exists, return the existing path
        instead of uploading again.
        """
        from apps.storage.models import FileHash

        try:
            file_hash = compute_file_hash(content)
        except Exception:
            # If hashing fails (e.g. non-seekable stream), fall back to normal upload
            return super()._save(name, content)

        existing = FileHash.objects.filter(hash=file_hash).first()
        if existing:
            # File already exists in R2 — bump reference count, reuse path
            FileHash.objects.filter(pk=existing.pk).update(
                reference_count=existing.reference_count + 1
            )
            logger.info(
                'Deduplicated upload: %s -> existing %s (hash: %s...)',
                name, existing.storage_path, file_hash[:12],
            )
            return existing.storage_path

        # New file — upload to R2
        saved_name = super()._save(name, content)

        # Record the hash
        file_size = content.size if hasattr(content, 'size') else 0
        original_name = getattr(content, 'name', name) or name
        FileHash.objects.create(
            hash=file_hash,
            storage_path=saved_name,
            original_filename=original_name[:255],
            file_size=file_size,
        )
        return saved_name
