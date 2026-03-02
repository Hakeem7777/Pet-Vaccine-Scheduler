def get_file_url(file_field, request=None):
    """
    Return the URL for a file field.

    For R2 storage: returns the presigned URL directly (already absolute).
    For local storage: uses request.build_absolute_uri if available.
    """
    if not file_field:
        return None
    url = file_field.url
    if url.startswith(('http://', 'https://')):
        return url
    if request:
        return request.build_absolute_uri(url)
    return url
