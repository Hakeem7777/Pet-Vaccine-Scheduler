import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function LoginForm({ onSuccess }) {
  const { login, enterGuestMode } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const userData = await login(formData.email, formData.password);
      onSuccess?.(userData);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="auth-form-logo" height="55px">
        <img src="/logoBanner.png" alt="PetVaxCalendar" />
      </div>

      <h2>Sign In</h2>
      <p className="auth-form-subtitle">
        Sign in to access your dashboard and manage pet vaccination records seamlessly.
      </p>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleChange}
          required
          autoComplete="email"
        />
      </div>

      <div className="form-group">
        <div className="form-group-header">
          <label htmlFor="password">Password</label>
          <Link to="/forgot-password" className="form-group-action">Forgot password?</Link>
        </div>
        <input
          type="password"
          id="password"
          name="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleChange}
          required
          autoComplete="current-password"
        />
      </div>

      <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>

      <p className="auth-link">
        Don't have an account? <Link to="/signup">Sign up</Link>
      </p>

      <div className="auth-divider">
        <span>Or</span>
      </div>

      <p className="auth-link auth-link-guest">
        <Link to="/home">Try it as Guest</Link> without an account
      </p>
    </form>
  );
}

export default LoginForm;
