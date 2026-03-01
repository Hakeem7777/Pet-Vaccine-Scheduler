import './AdBanner.css';

function AdBanner({ ads, position }) {
  const filtered = ads.filter((ad) => ad.position === position);
  if (filtered.length === 0) return null;

  const isHorizontal = position === 'top' || position === 'bottom';

  return (
    <div className={`ad-banner ad-banner--${position}`}>
      <div className={`ad-banner__container ${isHorizontal ? 'ad-banner__container--horizontal' : 'ad-banner__container--vertical'}`}>
        {filtered.map((ad) => (
          <a
            key={ad.id}
            href={ad.link_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="ad-banner__link"
            onClick={(e) => { if (!ad.link_url) e.preventDefault(); }}
          >
            <img
              src={ad.image_url}
              alt="Advertisement"
              className="ad-banner__image"
              loading="lazy"
            />
          </a>
        ))}
      </div>
    </div>
  );
}

export default AdBanner;
