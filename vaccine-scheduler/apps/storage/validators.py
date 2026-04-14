from django.core.exceptions import ValidationError


ALLOWED_IMAGE_TYPES = {
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
}
ALLOWED_VIDEO_TYPES = {
    'video/mp4', 'video/webm', 'video/ogg',
}
ALLOWED_PDF_TYPES = {
    'application/pdf',
}
ALLOWED_MEDIA_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES | ALLOWED_PDF_TYPES

MAX_IMAGE_SIZE = 50 * 1024 * 1024   # 50 MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100 MB


def validate_image_file(value):
    """Validate that the uploaded file is an allowed image type and within size limit."""
    if not value:
        return

    content_type = getattr(value, 'content_type', None)
    if content_type and content_type not in ALLOWED_IMAGE_TYPES:
        raise ValidationError(
            f'Unsupported image type: {content_type}. '
            f'Allowed: {", ".join(sorted(ALLOWED_IMAGE_TYPES))}'
        )

    if value.size > MAX_IMAGE_SIZE:
        max_mb = MAX_IMAGE_SIZE // (1024 * 1024)
        raise ValidationError(f'Image file size cannot exceed {max_mb}MB.')


def validate_video_file(value):
    """Validate that the uploaded file is an allowed video type and within size limit."""
    if not value:
        return

    content_type = getattr(value, 'content_type', None)
    if content_type and content_type not in ALLOWED_VIDEO_TYPES:
        raise ValidationError(
            f'Unsupported video type: {content_type}. '
            f'Allowed: {", ".join(sorted(ALLOWED_VIDEO_TYPES))}'
        )

    if value.size > MAX_VIDEO_SIZE:
        max_mb = MAX_VIDEO_SIZE // (1024 * 1024)
        raise ValidationError(f'Video file size cannot exceed {max_mb}MB.')


ALLOWED_DOCUMENT_TYPES = {
    'application/pdf',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
}
MAX_DOCUMENT_SIZE = 10 * 1024 * 1024  # 10 MB


def validate_document_file(value):
    """Validate uploaded document (PDF or image) type and size."""
    if not value:
        return

    content_type = getattr(value, 'content_type', None)
    if content_type and content_type not in ALLOWED_DOCUMENT_TYPES:
        raise ValidationError(
            f'Unsupported document type: {content_type}. '
            f'Allowed: {", ".join(sorted(ALLOWED_DOCUMENT_TYPES))}'
        )

    if value.size > MAX_DOCUMENT_SIZE:
        raise ValidationError('Document file size cannot exceed 10MB.')


def validate_media_file(value):
    """Validate uploaded media file (image, video, or PDF) type and size."""
    if not value:
        return

    content_type = getattr(value, 'content_type', None)
    if content_type and content_type not in ALLOWED_MEDIA_TYPES:
        raise ValidationError(
            f'Unsupported file type: {content_type}. '
            f'Allowed images: {", ".join(sorted(ALLOWED_IMAGE_TYPES))}. '
            f'Allowed videos: {", ".join(sorted(ALLOWED_VIDEO_TYPES))}. '
            f'Allowed documents: {", ".join(sorted(ALLOWED_PDF_TYPES))}.'
        )

    if content_type in ALLOWED_VIDEO_TYPES:
        max_size = MAX_VIDEO_SIZE
    else:
        max_size = MAX_IMAGE_SIZE

    if value.size > max_size:
        max_mb = max_size // (1024 * 1024)
        raise ValidationError(f'File size cannot exceed {max_mb}MB.')
