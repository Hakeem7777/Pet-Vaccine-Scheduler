import { Link } from 'react-router-dom';
import PageTransition from '../components/common/PageTransition';
import Footer from '../components/layout/Footer';

function NotFoundPage() {
  return (
    <div className="app-layout">
      <PageTransition className="auth-page">
        <div className="auth-form" style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '4rem', margin: '0 0 0.5rem', color: 'var(--color-primary)' }}>404</h1>
          <h2 style={{ marginBottom: '1rem' }}>Page Not Found</h2>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link
            to="/"
            className="btn btn-primary"
            style={{ display: 'inline-block', textDecoration: 'none' }}
          >
            Go Home
          </Link>
        </div>
      </PageTransition>
      <Footer />
    </div>
  );
}

export default NotFoundPage;
