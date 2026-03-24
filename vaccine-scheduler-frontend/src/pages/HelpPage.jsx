import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as helpVideosApi from '../api/helpVideos';
import PageTransition from '../components/common/PageTransition';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './HelpPage.css';

function HelpPage() {
  const [videos, setVideos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadVideos();
  }, [page]);

  async function loadVideos() {
    setLoading(true);
    try {
      const params = {};
      if (page > 1) params.page = page;
      const data = await helpVideosApi.getHelpVideos(params);
      setVideos(data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }

  const results = videos?.results || [];
  const hasNext = !!videos?.next;
  const hasPrev = !!videos?.previous;

  return (
    <PageTransition className="help-page">
      <div className="help-header">
        <h1>Help Videos</h1>
        <p>Watch tutorials to learn how to use PetVaxCalendar</p>
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          {results.length === 0 ? (
            <div className="help-empty">
              <p>No help videos yet. Check back soon!</p>
            </div>
          ) : (
            <div className="help-grid">
              {results.map((video) => (
                <Link to={`/help/${video.slug}`} key={video.id} className="help-card">
                  <div className="help-card__thumbnail">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt={video.title} />
                    ) : (
                      <div className="help-card__thumbnail-placeholder" />
                    )}
                    <div className="help-card__play-icon">
                      <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" /></svg>
                    </div>
                  </div>
                  <div className="help-card__body">
                    <h3 className="help-card__title">{video.title}</h3>
                    {video.description && <p className="help-card__description">{video.description}</p>}
                    <div className="help-card__meta">
                      <span>{new Date(video.published_at).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {(hasNext || hasPrev) && (
            <div className="help-pagination">
              <button className="btn btn-outline" disabled={!hasPrev} onClick={() => setPage(page - 1)}>Previous</button>
              <button className="btn btn-outline" disabled={!hasNext} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </PageTransition>
  );
}

export default HelpPage;
