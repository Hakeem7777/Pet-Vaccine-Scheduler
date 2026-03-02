import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as helpVideosApi from '../api/helpVideos';
import PageTransition from '../components/common/PageTransition';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './HelpPage.css';

/**
 * Extract a YouTube embed URL from a regular YouTube link.
 * Returns null if the URL is not a YouTube link.
 */
function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    // youtube.com/watch?v=ID
    if ((parsed.hostname === 'www.youtube.com' || parsed.hostname === 'youtube.com') && parsed.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${parsed.searchParams.get('v')}`;
    }
    // youtu.be/ID
    if (parsed.hostname === 'youtu.be' && parsed.pathname.length > 1) {
      return `https://www.youtube.com/embed${parsed.pathname}`;
    }
    // Already an embed URL
    if ((parsed.hostname === 'www.youtube.com' || parsed.hostname === 'youtube.com') && parsed.pathname.startsWith('/embed/')) {
      return url;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

function HelpVideoDetailPage() {
  const { slug } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadVideo();
  }, [slug]);

  async function loadVideo() {
    setLoading(true);
    setError(null);
    try {
      const data = await helpVideosApi.getHelpVideoBySlug(slug);
      setVideo(data);
    } catch {
      setError('Help video not found.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <PageTransition className="help-detail-page">
        <LoadingSpinner />
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition className="help-detail-page">
        <div className="help-detail__error">
          <p>{error}</p>
          <Link to="/help" className="btn btn-primary">Back to Help Videos</Link>
        </div>
      </PageTransition>
    );
  }

  const youtubeEmbedUrl = getYouTubeEmbedUrl(video.video_url);

  return (
    <PageTransition className="help-detail-page">
      <Link to="/help" className="help-detail__back">&larr; Back to Help Videos</Link>

      <div className="help-detail__video-container">
        {youtubeEmbedUrl ? (
          <iframe
            src={youtubeEmbedUrl}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : video.video_file_url ? (
          <video controls preload="metadata">
            <source src={video.video_file_url} />
            Your browser does not support the video tag.
          </video>
        ) : video.video_url ? (
          <video controls preload="metadata">
            <source src={video.video_url} />
            Your browser does not support the video tag.
          </video>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>
            No video available.
          </div>
        )}
      </div>

      <article>
        <h1 className="help-detail__title">{video.title}</h1>
        <div className="help-detail__meta">
          <span>{new Date(video.published_at).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
          })}</span>
        </div>
        {video.description && (
          <div className="help-detail__description">
            <p>{video.description}</p>
          </div>
        )}
      </article>
    </PageTransition>
  );
}

export default HelpVideoDetailPage;
