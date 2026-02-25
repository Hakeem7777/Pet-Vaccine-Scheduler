import { useState } from 'react';
import useGuestStore from '../../store/useGuestStore';
import { captureLeadEmail } from '../../api/dashboard';

function EmailCaptureGate({ onUnlock }) {
  const { setCapturedEmail } = useGuestStore();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await captureLeadEmail(trimmed);
    } catch {
      // Silently continue - don't block the user if API fails
    }
    setCapturedEmail(trimmed);
    setSubmitting(false);
    onUnlock();
  }

  return (
    <div className="email-gate">
      <div className="email-gate__card">
        <div className="email-gate__icon">
          <img src="/Images/dog_icon.svg" alt="" width="48" height="48" />
        </div>
        <h3 className="email-gate__title">Your schedule is ready!</h3>
        <p className="email-gate__subtitle">
          Enter your email to view your personalized vaccine schedule. We&apos;ll
          also send you a copy for safekeeping.
        </p>
        <form onSubmit={handleSubmit} className="email-gate__form">
          <input
            type="email"
            className="email-gate__input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
          />
          {error && <p className="email-gate__error">{error}</p>}
          <button
            type="submit"
            className="btn btn-primary btn-pill email-gate__btn"
            disabled={submitting}
          >
            {submitting ? 'Loading...' : 'View My Schedule'}
          </button>
        </form>
        <p className="email-gate__privacy">
          No spam, ever. We only use your email to improve your experience.
        </p>
      </div>
    </div>
  );
}

export default EmailCaptureGate;
