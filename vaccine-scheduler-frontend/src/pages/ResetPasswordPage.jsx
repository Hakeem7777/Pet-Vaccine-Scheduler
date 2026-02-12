import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset } from '../api/auth';
import PageTransition from '../components/common/PageTransition';
import Footer from '../components/layout/Footer';

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    new_password: '',
    new_password_confirm: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (formData.new_password !== formData.new_password_confirm) {
      setError('Passwords do not match.');
      return;
    }

    if (!uid || !token) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }

    setIsLoading(true);

    try {
      await confirmPasswordReset(uid, token, formData.new_password, formData.new_password_confirm);
      setSuccess(true);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const fieldErrors = err.response?.data;
      if (detail) {
        setError(detail);
      } else if (fieldErrors?.new_password) {
        setError(Array.isArray(fieldErrors.new_password) ? fieldErrors.new_password.join(' ') : fieldErrors.new_password);
      } else {
        setError('Failed to reset password. The link may have expired.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (!uid || !token) {
    return (
      <div className="app-layout">
        <PageTransition className="auth-page">
          <div className="auth-form">
            <h2>Invalid Reset Link</h2>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link to="/forgot-password" className="btn btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Request New Link
            </Link>
          </div>
        </PageTransition>
        <Footer />
      </div>
    );
  }

  return (
    <div className="app-layout">
      <PageTransition className="auth-page">
        {success ? (
          <div className="auth-form">
            <h2>Password Reset</h2>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <h2>Set New Password</h2>

            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="new_password">New Password</label>
              <input
                type="password"
                id="new_password"
                name="new_password"
                value={formData.new_password}
                onChange={handleChange}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>

            <div className="form-group">
              <label htmlFor="new_password_confirm">Confirm New Password</label>
              <input
                type="password"
                id="new_password_confirm"
                name="new_password_confirm"
                value={formData.new_password_confirm}
                onChange={handleChange}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </PageTransition>
      <Footer />
    </div>
  );
}

export default ResetPasswordPage;
