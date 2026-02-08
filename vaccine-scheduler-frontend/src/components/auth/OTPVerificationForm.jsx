import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function OTPVerificationForm({ email, onSuccess }) {
  const { verifyOTP, resendOTP } = useAuth();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await verifyOTP(email, otp);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.detail || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError('');
    setResendMessage('');

    try {
      const data = await resendOTP(email);
      setResendMessage(data.message || 'A new code has been sent.');
      setResendCooldown(60);
      setOtp('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend code.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>Verify Your Email</h2>

      <p style={{ textAlign: 'center', color: '#5f6b76', marginBottom: '1.5rem' }}>
        We sent a 6-digit verification code to<br />
        <strong>{email}</strong>
      </p>

      {error && <div className="error-message">{error}</div>}
      {resendMessage && (
        <div className="success-message" style={{
          backgroundColor: '#F0FFF4',
          color: '#2AB57F',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          border: '1px solid #2AB57F',
        }}>
          {resendMessage}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="otp">Verification Code</label>
        <input
          type="text"
          id="otp"
          name="otp"
          value={otp}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
            setOtp(val);
          }}
          placeholder="Enter 6-digit code"
          required
          maxLength={6}
          style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
          autoComplete="one-time-code"
          inputMode="numeric"
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={isLoading || otp.length !== 6}>
        {isLoading ? 'Verifying...' : 'Verify'}
      </button>

      <p className="auth-link">
        Didn't receive the code?{' '}
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0}
          style={{
            background: 'none',
            border: 'none',
            color: resendCooldown > 0 ? '#999' : 'var(--color-primary)',
            cursor: resendCooldown > 0 ? 'default' : 'pointer',
            textDecoration: 'underline',
            padding: 0,
            font: 'inherit',
          }}
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
        </button>
      </p>

      <p className="auth-link">
        <Link to="/register">Back to registration</Link>
      </p>
    </form>
  );
}

export default OTPVerificationForm;
