import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import * as blogsApi from '../api/blogs';
import PageTransition from '../components/common/PageTransition';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './BlogsPage.css';

// Insert word-joiner (U+2060) between adjacent inline elements where
// there is no whitespace, preventing the browser from breaking mid-word.
function preventSpanBreaks(html) {
  return html.replace(/<\/span><span/g, '</span>\u2060<span');
}

function BlogDetailPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPost();
  }, [slug]);

  async function loadPost() {
    setLoading(true);
    setError(null);
    try {
      const data = await blogsApi.getBlogBySlug(slug);
      setPost(data);
    } catch {
      setError('Blog post not found.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <PageTransition className="blog-detail-page">
        <LoadingSpinner />
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition className="blog-detail-page">
        <div className="blog-detail__error">
          <p>{error}</p>
          <Link to="/blogs" className="btn btn-primary">Back to Blog</Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="blog-detail-page">
      <Link to="/blogs" className="blog-detail__back">&larr; Back to Blog</Link>

      {post.featured_image_url && (
        <img className="blog-detail__hero" src={post.featured_image_url} alt={post.title} />
      )}

      <article className="blog-detail__article">
        <h1 className="blog-detail__title">{post.title}</h1>
        <div className="blog-detail__meta">
          <span>By {post.author_name}</span>
          <span>{new Date(post.published_at).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
          })}</span>
        </div>
        <div
          className="blog-detail__content"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(preventSpanBreaks(post.content), {
            ALLOWED_TAGS: [
              'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
              'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
              'a', 'img', 'video', 'audio', 'source', 'iframe',
              'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
              'span', 'div', 'figure', 'figcaption', 'sub', 'sup',
            ],
            ALLOWED_ATTR: [
              'href', 'target', 'rel', 'src', 'alt', 'width', 'height',
              'controls', 'autoplay', 'loop', 'muted', 'preload', 'type',
              'class', 'style', 'id',
              'frameborder', 'allowfullscreen',
            ],
          }) }}
        />
      </article>
    </PageTransition>
  );
}

export default BlogDetailPage;
