import { useState } from 'react';
import { trackAdClick } from '../../api/advertisements';
import './AdBanner.css';

function resolveAdImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
  const origin = apiBase.startsWith('http://') || apiBase.startsWith('https://')
    ? apiBase.replace(/\/api\/?$/, '')
    : window.location.origin;

  return `${origin.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}

function AdBanner({ ads, position }) {
  const [failedImageIds, setFailedImageIds] = useState(() => new Set());
  const filtered = ads.filter((ad) => ad.position === position && !failedImageIds.has(ad.id));
  if (filtered.length === 0) return null;

  const isHorizontal = position === 'top' || position === 'bottom';

  function handleClick(ad, e) {
    if (!ad.link_url) {
      e.preventDefault();
      return;
    }
    trackAdClick(ad.id);
  }

  function handleImageError(ad, imageUrl) {
    console.warn('Advertisement image failed to load:', imageUrl);
    setFailedImageIds((current) => {
      const next = new Set(current);
      next.add(ad.id);
      return next;
    });
  }

  return (
    <div className={`ad-banner ad-banner--${position}`}>
      <div className={`ad-banner__container ${isHorizontal ? 'ad-banner__container--horizontal' : 'ad-banner__container--vertical'}`}>
        {filtered.map((ad) => {
          const imageUrl = resolveAdImageUrl(ad.image_url);
          if (!imageUrl) return null;

          return (
            <a
              key={ad.id}
              href={ad.link_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="ad-banner__link"
              onClick={(e) => handleClick(ad, e)}
            >
              <img
                src={imageUrl}
                alt="Advertisement"
                className="ad-banner__image"
                loading="lazy"
                onError={() => handleImageError(ad, imageUrl)}
              />
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default AdBanner;
