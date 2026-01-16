import { useState } from 'react';
import Modal from '../common/Modal';
import { exportAllToICS, exportToGoogleCalendar, exportSingleToICS, generateGoogleCalendarUrl } from '../../utils/calendarExport';
import { sendScheduleEmail } from '../../api/email';
import './ExportModal.css';

const ALL_TABS = [
  { id: 'apple', label: 'Apple Calendar', icon: 'apple' },
  { id: 'google', label: 'Google Calendar', icon: 'google' },
  { id: 'pdf', label: 'Save as PDF', icon: 'pdf' },
  { id: 'email', label: 'Email', icon: 'email' },
];

// Single item mode excludes PDF (no single-item PDF export)
const SINGLE_TABS = [
  { id: 'apple', label: 'Apple Calendar', icon: 'apple' },
  { id: 'google', label: 'Google Calendar', icon: 'google' },
  { id: 'email', label: 'Email', icon: 'email' },
];

/**
 * ExportModal - Export vaccination schedule to various formats
 *
 * @param {boolean} isOpen - Whether modal is open
 * @param {function} onClose - Close handler
 * @param {object} schedule - Full schedule with overdue/upcoming/future arrays (for all export)
 * @param {string} dogName - Dog's name
 * @param {object} dogInfo - Dog info for email
 * @param {object} singleItem - Optional: single vaccine item to export (excludes PDF tab)
 */
function ExportModal({ isOpen, onClose, schedule, dogName, dogInfo, singleItem = null }) {
  const isSingleMode = singleItem !== null;
  const TABS = isSingleMode ? SINGLE_TABS : ALL_TABS;
  const [activeTab, setActiveTab] = useState('apple');
  const [emails, setEmails] = useState(['']);
  const [emailError, setEmailError] = useState('');
  const [isEmailSending, setIsEmailSending] = useState(false);

  function handleExportICS() {
    if (isSingleMode) {
      exportSingleToICS(singleItem, dogName || 'Dog');
    } else {
      exportAllToICS(schedule, dogName || 'Dog');
    }
  }

  function handleExportGoogle() {
    if (isSingleMode) {
      const url = generateGoogleCalendarUrl(singleItem, dogName || 'Dog');
      window.open(url, '_blank');
    } else {
      exportToGoogleCalendar(schedule, dogName || 'Dog');
    }
  }

  function handleExportPDF() {
    // PDF export only available for full schedule
    if (isSingleMode) return;
    onClose();
    setTimeout(() => {
      window.print();
    }, 100);
  }

  function handleMainExport() {
    switch (activeTab) {
      case 'apple':
        handleExportICS();
        break;
      case 'google':
        handleExportGoogle();
        break;
      case 'pdf':
        handleExportPDF();
        break;
      default:
        break;
    }
  }

  // Email handling
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function handleEmailChange(index, value) {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
    setEmailError('');
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

  async function handleSendEmail(e) {
    e.preventDefault();

    const validEmails = emails.filter(email => email.trim() !== '');

    if (validEmails.length === 0) {
      setEmailError('Please enter at least one email address');
      return;
    }

    const invalidEmails = validEmails.filter(email => !validateEmail(email));
    if (invalidEmails.length > 0) {
      setEmailError(`Invalid email address: ${invalidEmails[0]}`);
      return;
    }

    setIsEmailSending(true);
    try {
      // For single item mode, create a schedule with just that item in 'upcoming'
      const emailSchedule = isSingleMode
        ? { overdue: [], upcoming: [singleItem], future: [] }
        : schedule;

      await sendScheduleEmail({
        emails: validEmails,
        dogName: dogName || 'Dog',
        dogInfo,
        schedule: emailSchedule,
      });
      alert('Email sent successfully!');
      setEmails(['']);
      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
      alert(error.response?.data?.error || 'Failed to send email. Please try again.');
    } finally {
      setIsEmailSending(false);
    }
  }

  function handleClose() {
    setEmails(['']);
    setEmailError('');
    onClose();
  }

  function renderTabIcon(iconType) {
    switch (iconType) {
      case 'apple':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
        );
      case 'google':
        return (
          <svg viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        );
            case 'pdf':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
            <path d="M8 12h8v1.5H8zm0 3h8v1.5H8zm0-6h5v1.5H8z"/>
          </svg>
        );
      case 'email':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
        );
      default:
        return null;
    }
  }

  function renderTabContent() {
    switch (activeTab) {
      case 'apple':
        return (
          <div className="export-tab-content">
            <h4>Import to Apple Calendar</h4>
            <ol className="export-steps">
              <li>Click the "Download" button above</li>
              <li>Open the downloaded file</li>
              <li>Apple Calendar will prompt you to add the events</li>
              <li>Click "Add" to confirm</li>
            </ol>
          </div>
        );

      case 'google':
        return (
          <div className="export-tab-content">
            <h4>Import to Google Calendar</h4>
            <div className="export-steps-with-screenshots">
              <div className="export-step-item">
                <div className="export-step-number">1</div>
                <div className="export-step-content">
                  <p>Click the "Download" button above. The .ics file will download automatically and Google Calendar will open.</p>
                  <div className="export-screenshot">
                    <img src="/exportSteps/Google/step 1.png" alt="Step 1: Click the download button" />
                  </div>
                </div>
              </div>

              <div className="export-step-item">
                <div className="export-step-number">2</div>
                <div className="export-step-content">
                  <p>Click "Select file from your computer" and select the downloaded .ics file</p>
                  <div className="export-screenshot">
                    <img src="/exportSteps/Google/step 2.png" alt="Step 2: Select file from computer" />
                  </div>
                </div>
              </div>

              <div className="export-step-item">
                <div className="export-step-number">3</div>
                <div className="export-step-content">
                  <p>Choose which calendar to add events to</p>
                  <div className="export-screenshot">
                    <img src="/exportSteps/Google/step 3.png" alt="Step 3: Choose calendar" />
                  </div>
                </div>
              </div>

              <div className="export-step-item">
                <div className="export-step-number">4</div>
                <div className="export-step-content">
                  <p>Click "Import"</p>
                  <div className="export-screenshot">
                    <img src="/exportSteps/Google/step 4.png" alt="Step 4: Click Import" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'pdf':
        return (
          <div className="export-tab-content">
            <h4>Save as PDF</h4>
            <ol className="export-steps">
              <li>Click the "Download" button above</li>
              <li>Select "Save as PDF" as your printer/destination</li>
              <li>Choose your save location</li>
              <li>Click "Save" or "Print"</li>
            </ol>
          </div>
        );

      case 'email':
        return (
          <div className="export-tab-content">
            <h4>Send {isSingleMode ? 'Vaccine Reminder' : 'Schedule'} via Email</h4>
            <p className="export-email-description">
              {isSingleMode ? (
                <>Send a reminder for {dogName}'s {singleItem?.vaccine} vaccination to one or more email addresses.
                Recipients will receive the vaccine details along with a PDF attachment,
                calendar invite (ICS file), and a Google Calendar link.</>
              ) : (
                <>Send {dogName}'s vaccination schedule to one or more email addresses.
                Recipients will receive the schedule details along with a PDF attachment,
                calendar invite (ICS file), and a Google Calendar link.</>
              )}
            </p>

            <form onSubmit={handleSendEmail}>
              <div className="email-list">
                {emails.map((email, index) => (
                  <div key={index} className="email-input-row">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(index, e.target.value)}
                      placeholder="Enter email address"
                      className="email-input"
                      disabled={isEmailSending}
                    />
                    {emails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(index)}
                        className="email-remove-btn"
                        disabled={isEmailSending}
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
                  disabled={isEmailSending}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add another email
                </button>
              )}

              {emailError && <div className="email-error">{emailError}</div>}

              <div className="export-action">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isEmailSending}
                >
                  {isEmailSending ? (
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
          </div>
        );

      default:
        return null;
    }
  }

  const headerActionButton = activeTab !== 'email' ? (
    <button className="btn btn-primary" onClick={handleMainExport}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Download
    </button>
  ) : null;

  const modalTitle = isSingleMode
    ? `Export ${singleItem?.vaccine || 'Vaccine'}`
    : 'Export Vaccination Schedule';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} headerAction={headerActionButton}>
      <div className="export-modal">
        <nav className="export-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`export-tab ${activeTab === tab.id ? 'export-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="export-tab-icon">{renderTabIcon(tab.icon)}</span>
              <span className="export-tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        {renderTabContent()}
      </div>
    </Modal>
  );
}

export default ExportModal;
