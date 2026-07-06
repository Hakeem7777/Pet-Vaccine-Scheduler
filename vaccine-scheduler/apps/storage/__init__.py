from django.conf import settings


def _join_url(base_url, path):
    """Join a base URL and storage path without losing path components."""
    if not base_url or not path:
        return None
    return f"{base_url.rstrip('/')}/{str(path).lstrip('/')}"


def get_file_url(file_field, request=None, prefer_public=False):
    """
    Return the URL for a file field.

    When prefer_public=True and MEDIA_PUBLIC_URL or R2_PUBLIC_URL is configured,
    return a stable public URL based on the stored object name. This is useful
    for public assets such as advertisements that need to load in unauthenticated
    browser <img> tags.

    Otherwise, return the storage backend URL. For local storage, build an
    absolute request URL when possible.
    """
    if not file_field:
        return None

    if prefer_public:
        public_base_url = (
            getattr(settings, 'MEDIA_PUBLIC_URL', '')
            or getattr(settings, 'R2_PUBLIC_URL', '')
        )
        public_url = _join_url(public_base_url, file_field.name)
        if public_url:
            return public_url

    url = file_field.url
    if url.startswith(('http://', 'https://')):
        return url
    if request:
        return request.build_absolute_uri(url)
    return url
