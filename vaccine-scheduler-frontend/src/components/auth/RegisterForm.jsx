import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function RegisterForm({ onSuccess }) {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      await register(formData);
      navigate('/verify-otp', { state: { email: formData.email } });
    } catch (err) {
      if (err.response?.data) {
        setErrors(err.response.data);
      } else {
        setErrors({ general: 'Registration failed. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form auth-form--register">
      <div className="auth-form-logo" height="55px">
        <img src="/logoBanner.png" alt="PetVaxCalendar" />
      </div>

      <h2>Sign Up</h2>
      <p className="auth-form-subtitle">
        Join PetVaxCalendar to manage pet vaccinations easily and securely.
      </p>

      {errors.general && <div className="error-message">{errors.general}</div>}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="username">Username*</label>
          <input
            type="text"
            id="username"
            name="username"
            placeholder="Enter your username"
            value={formData.username}
            onChange={handleChange}
            required
          />
          {errors.username && <span className="field-error">{errors.username}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email*</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="first_name">First name</label>
          <input
            type="text"
            id="first_name"
            name="first_name"
            placeholder="Enter your first name"
            value={formData.first_name}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="last_name">Last name</label>
          <input
            type="text"
            id="last_name"
            name="last_name"
            placeholder="Enter your last name"
            value={formData.last_name}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="password">Password*</label>
          <div className="input-password-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
            />
            <button
              type="button"
              className="input-password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                {showPassword ? (
                  <>
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </>
                ) : (
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                )}
              </svg>
            </button>
          </div>
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="password_confirm">Confirm Password</label>
          <div className="input-password-wrapper">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="password_confirm"
              name="password_confirm"
              placeholder="Enter your password"
              value={formData.password_confirm}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="input-password-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                {showConfirmPassword ? (
                  <>
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </>
                ) : (
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                )}
              </svg>
            </button>
          </div>
          {errors.password_confirm && <span className="field-error">{errors.password_confirm}</span>}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="phone">Phone</label>
        <div className="input-phone-wrapper">
          <span className="input-phone-prefix">US</span>
          <input
            type="tel"
            id="phone"
            name="phone"
            placeholder="Enter your number"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>
      </div>

      <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
        {isLoading ? 'Signing up...' : 'Sign Up'}
      </button>

      <p className="auth-link">
        Already have an account? <Link to="/login">Sign In</Link>
      </p>
    </form>
  );
}

export default RegisterForm;
