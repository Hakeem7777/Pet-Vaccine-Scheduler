import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as blogsApi from '../api/blogs';
import PageTransition from '../components/common/PageTransition';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './BlogsPage.css';

function BlogsPage() {
  const [blogs, setBlogs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadBlogs();
  }, [page]);

  async function loadBlogs() {
    setLoading(true);
    try {
      const params = {};
      if (page > 1) params.page = page;
      const data = await blogsApi.getBlogs(params);
      setBlogs(data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }

  const results = blogs?.results || [];
  const hasNext = !!blogs?.next;
  const hasPrev = !!blogs?.previous;

  return (
    <PageTransition className="blogs-page">
      <div className="blogs-header">
        <h1>Our Blog</h1>
        <p>Tips, guides, and insights about dog vaccination and pet health</p>
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          {results.length === 0 ? (
            <div className="blogs-empty">
              <p>No blog posts yet. Check back soon!</p>
            </div>
          ) : (
            <div className="blogs-grid">
              {results.map((post) => (
                <Link to={`/blogs/${post.slug}`} key={post.id} className="blog-card">
                  <div className="blog-card__image">
                    {post.featured_image_url ? (
                      <img src={post.featured_image_url} alt={post.title} />
                    ) : (
                      <div className="blog-card__image-placeholder" />
                    )}
                  </div>
                  <div className="blog-card__body">
                    <h3 className="blog-card__title">{post.title}</h3>
                    {post.excerpt && <p className="blog-card__excerpt">{post.excerpt}</p>}
                    <div className="blog-card__meta">
                      <span>{post.author_name}</span>
                      <span>{new Date(post.published_at).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {(hasNext || hasPrev) && (
            <div className="blogs-pagination">
              <button className="btn btn-outline" disabled={!hasPrev} onClick={() => setPage(page - 1)}>Previous</button>
              <button className="btn btn-outline" disabled={!hasNext} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </PageTransition>
  );
}

export default BlogsPage;
