const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

function getApiOrigin() {
  if (!API_BASE_URL || API_BASE_URL === '/api') {
    return '';
  }

  try {
    const url = new URL(API_BASE_URL, window.location.origin);
    return url.origin;
  } catch {
    return '';
  }
}

export function getMediaUrl(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return '';
  }

  if (/^(https?:)?\/\//i.test(trimmedUrl) || /^data:/i.test(trimmedUrl) || /^blob:/i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  if (trimmedUrl.startsWith('/media/') || trimmedUrl.startsWith('/uploads/')) {
    return `${getApiOrigin()}${trimmedUrl}`;
  }

  if (trimmedUrl.startsWith('media/') || trimmedUrl.startsWith('uploads/')) {
    return `${getApiOrigin()}/${trimmedUrl}`;
  }

  return trimmedUrl;
}

export function handleImageError(event) {
  event.currentTarget.style.display = 'none';
  const placeholder = event.currentTarget.nextElementSibling;

  if (placeholder?.classList?.contains('blog-card__image-placeholder')) {
    placeholder.hidden = false;
  }
}
