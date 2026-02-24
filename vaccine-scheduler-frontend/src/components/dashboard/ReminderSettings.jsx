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

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, '0')}:00`,
}));

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'America/Mexico_City',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Moscow',
  'Europe/Istanbul',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Singapore',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Africa/Cairo',
  'Africa/Lagos',
  'Africa/Johannesburg',
];

function getTimezoneOptions(savedTz) {
  const set = new Set(COMMON_TIMEZONES);
  // Include browser timezone
  try {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTz) set.add(browserTz);
  } catch { /* ignore */ }
  // Include saved timezone
  if (savedTz) set.add(savedTz);
  return Array.from(set).sort();
}

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

  async function handleStringChange(field, value) {
    setSaving(true);
    setMsg(null);
    try {
      const updated = await updateReminderPreferences({ [field]: value });
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
            Get notified before vaccinations are due.
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

          <div className="reminder-settings__row">
            <label className="reminder-settings__label" htmlFor="preferred-hour">
              Send at
            </label>
            <select
              id="preferred-hour"
              className="input reminder-settings__select"
              value={prefs.preferred_hour}
              onChange={(e) => handleSelectChange('preferred_hour', e.target.value)}
              disabled={saving}
            >
              {HOUR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="reminder-settings__row">
            <label className="reminder-settings__label" htmlFor="preferred-tz">
              Timezone
            </label>
            <select
              id="preferred-tz"
              className="input reminder-settings__select reminder-settings__select--wide"
              value={prefs.preferred_timezone}
              onChange={(e) => handleStringChange('preferred_timezone', e.target.value)}
              disabled={saving}
            >
              {getTimezoneOptions(prefs.preferred_timezone).map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

    
    </div>
  );
}

export default ReminderSettings;
