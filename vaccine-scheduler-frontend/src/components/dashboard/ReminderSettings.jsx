import { useState, useEffect } from 'react';
import { getReminderPreferences, updateReminderPreferences } from '../../api/dashboard';
import './ReminderSettings.css';

const LEAD_TIME_OPTIONS = [
  { value: 1, label: '1 day' },
  { value: 3, label: '3 days' },
  { value: 7, label: '1 week' },
  { value: 14, label: '2 weeks' },
  { value: 30, label: '1 month' },
];

const INTERVAL_OPTIONS = [
  { value: 1, label: 'Every hour' },
  { value: 6, label: 'Every 6 hours' },
  { value: 12, label: 'Every 12 hours' },
  { value: 24, label: 'Once a day' },
  { value: 48, label: 'Every 2 days' },
  { value: 72, label: 'Every 3 days' },
];

function ReminderSettings() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    getReminderPreferences()
      .then(setPrefs)
      .catch(() => setMsg({ type: 'error', text: 'Failed to load reminder settings.' }))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle() {
    const newValue = !prefs.reminders_enabled;
    setSaving(true);
    setMsg(null);
    try {
      const updated = await updateReminderPreferences({ reminders_enabled: newValue });
      setPrefs(updated);
      setMsg({
        type: 'success',
        text: newValue ? 'Reminders enabled.' : 'Reminders disabled.',
      });
    } catch {
      setMsg({ type: 'error', text: 'Failed to update setting.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleSelectChange(field, value) {
    setSaving(true);
    setMsg(null);
    try {
      const updated = await updateReminderPreferences({ [field]: parseInt(value, 10) });
      setPrefs(updated);
      setMsg({ type: 'success', text: 'Setting saved.' });
    } catch (err) {
      const detail = err.response?.data?.[field]?.[0] || 'Failed to update setting.';
      setMsg({ type: 'error', text: detail });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="reminder-settings__loading">Loading...</div>;
  }

  if (!prefs) {
    return null;
  }

  return (
    <div className="reminder-settings">
      <div className="reminder-settings__row reminder-settings__toggle-row">
        <div className="reminder-settings__toggle-info">
          <span className="reminder-settings__label">Email Reminders</span>
          <span className="reminder-settings__desc">
            Get notified before vaccinations are due
          </span>
        </div>
        <button
          className={`reminder-toggle ${prefs.reminders_enabled ? 'reminder-toggle--on' : ''}`}
          onClick={handleToggle}
          disabled={saving}
          aria-label="Toggle reminders"
        >
          <span className="reminder-toggle__thumb" />
        </button>
      </div>

      {prefs.reminders_enabled && (
        <>
          <div className="reminder-settings__row">
            <label className="reminder-settings__label" htmlFor="lead-time">
              Remind me
            </label>
            <select
              id="lead-time"
              className="input reminder-settings__select"
              value={prefs.lead_time_days}
              onChange={(e) => handleSelectChange('lead_time_days', e.target.value)}
              disabled={saving}
            >
              {LEAD_TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} before
                </option>
              ))}
            </select>
          </div>

          <div className="reminder-settings__row">
            <label className="reminder-settings__label" htmlFor="interval">
              Repeat
            </label>
            <select
              id="interval"
              className="input reminder-settings__select"
              value={prefs.interval_hours}
              onChange={(e) => handleSelectChange('interval_hours', e.target.value)}
              disabled={saving}
            >
              {INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {msg && (
        <p className={`profile-msg profile-msg--${msg.type}`}>{msg.text}</p>
      )}
    </div>
  );
}

export default ReminderSettings;
