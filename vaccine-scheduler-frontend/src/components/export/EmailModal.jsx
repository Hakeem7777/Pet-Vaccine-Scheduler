import { useState } from 'react';
import Modal from '../common/Modal';
import './EmailModal.css';

function EmailModal({ isOpen, onClose, onSend, dogName, isLoading }) {
  const [emails, setEmails] = useState(['']);
  const [error, setError] = useState('');

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function handleEmailChange(index, value) {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
    setError('');
  }

  function handleAddEmail() {
    if (emails.length < 10) {
      setEmails([...emails, '']);
    }
  }

  function handleRemoveEmail(index) {
    if (emails.length > 1) {
      const newEmails = emails.filter((_, i) => i !== index);
      setEmails(newEmails);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();

    const validEmails = emails.filter(email => email.trim() !== '');

    if (validEmails.length === 0) {
      setError('Please enter at least one email address');
      return;
    }

    const invalidEmails = validEmails.filter(email => !validateEmail(email));
    if (invalidEmails.length > 0) {
      setError(`Invalid email address: ${invalidEmails[0]}`);
      return;
    }

    onSend(validEmails);
  }

  function handleClose() {
    setEmails(['']);
    setError('');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Send Schedule via Email">
      <form onSubmit={handleSubmit} className="email-modal-form">
        <p className="email-modal-description">
          Send {dogName}'s vaccination schedule to one or more email addresses.
          Recipients will receive the schedule details along with a PDF attachment,
          calendar invite (ICS file), and a Google Calendar link.
        </p>

        <div className="email-list">
          {emails.map((email, index) => (
            <div key={index} className="email-input-row">
              <input
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(index, e.target.value)}
                placeholder="Enter email address"
                className="email-input"
                disabled={isLoading}
              />
              {emails.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveEmail(index)}
                  className="email-remove-btn"
                  disabled={isLoading}
                  aria-label="Remove email"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {emails.length < 10 && (
          <button
            type="button"
            onClick={handleAddEmail}
            className="email-add-btn"
            disabled={isLoading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add another email
          </button>
        )}

        {error && <div className="email-error">{error}</div>}

        <div className="email-attachments-info">
          <h4>Attachments included:</h4>
          <ul>
            <li>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
              </svg>
              PDF Schedule
            </li>
            <li>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
              </svg>
              Calendar Invite (ICS)
            </li>
            <li>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google Calendar Link
            </li>
          </ul>
        </div>

        <div className="email-modal-actions">
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-outline"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="btn-spinner"></span>
                Sending...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13"></path>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
                </svg>
                Send Email
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default EmailModal;
