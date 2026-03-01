import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats } from '../api/dashboard';
import * as authApi from '../api/auth';
import * as subscriptionsApi from '../api/subscriptions';
import ReminderSettings from '../components/dashboard/ReminderSettings';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageTransition from '../components/common/PageTransition';
import './MyDashboardPage.css';

function MyDashboardPage() {
  const navigate = useNavigate();
  const { user, isAdmin, refreshUser, subscription, isPaid, isPro, subscriptionPlan } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Subscription cancel state
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [subMsg, setSubMsg] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelConfirmText, setCancelConfirmText] = useState('');

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ old_password: '', new_password: '', new_password_confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      getDashboardStats()
        .then(setStats)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isAdmin]);

  if (isAdmin) {
    return <Navigate to="/admin-panel" replace />;
  }

  if (loading) {
    return (
      <div className="page-loading">
        <LoadingSpinner />
      </div>
    );
  }

  function startEditing() {
    setFormData({
      username: user?.username || '',
      phone: user?.phone || '',
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
    });
    setMsg(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setMsg(null);
  }

  function handleChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      await authApi.patchProfile(formData);
      await refreshUser();
      setEditing(false);
      setMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      const data = err.response?.data;
      const detail = data?.username?.[0] || data?.email?.[0] || data?.phone?.[0] || data?.detail || 'Failed to update profile.';
      setMsg({ type: 'error', text: detail });
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSave(e) {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.new_password_confirm) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setPasswordSaving(true);
    setPasswordMsg(null);
    try {
      await authApi.changePassword(passwordData);
      setPasswordData({ old_password: '', new_password: '', new_password_confirm: '' });
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
      setTimeout(() => setShowPasswordModal(false), 1500);
    } catch (err) {
      const data = err.response?.data;
      const detail = data?.old_password?.[0] || data?.new_password?.[0] || data?.new_password_confirm?.[0] || data?.detail || 'Failed to change password.';
      setPasswordMsg({ type: 'error', text: detail });
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <PageTransition className="my-dashboard">
      <div className="page-header">
        <h2>User Dashboard</h2>
        <div className="page-header-actions">
          <Link to="/home" className="btn btn-primary btn-pill">
            My Pets
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="my-dashboard__stats">
        <div className="my-dash-card">
          <div className="my-dash-card__content">
            <div className="my-dash-card__number">{stats?.dog_count ?? 0}</div>
            <div className="my-dash-card__label">Total Dogs</div>
          </div>
          <div className="my-dash-card__icon my-dash-card__icon--dog">
            <img src="/Images/dog_icon.svg" alt="" width="28" height="28" />
          </div>
        </div>
        <div className="my-dash-card">
          <div className="my-dash-card__content">
            <div className="my-dash-card__number">{stats?.vaccination_count ?? 0}</div>
            <div className="my-dash-card__label">Total Vaccinations</div>
          </div>
          <div className="my-dash-card__icon">
            <img src="/Images/generic_icons/syringe_icon.svg" alt="" width="28" height="28" />
          </div>
        </div>
      </div>

      {/* My Profile */}
      <div className="my-dashboard__section">
        <div className="my-dashboard__section-header">
          <h3 className="my-dashboard__section-title">My Profile</h3>
          {!editing && (
            <button className="btn btn-outline btn-pill" onClick={startEditing}>
              Edit Profile
              <img src="/Images/generic_icons/Edit-Icon.svg" alt="" width="16" height="16" />
            </button>
          )}
        </div>

        {msg && !editing && (
          <p className={`profile-msg profile-msg--${msg.type}`}>{msg.text}</p>
        )}

        {!editing ? (
          <div className="my-dashboard__profile-grid">
            <div className="my-dashboard__profile-card">
              <span className="my-dashboard__profile-label">Username</span>
              <span className="my-dashboard__profile-value">{user?.username || '-'}</span>
            </div>
            <div className="my-dashboard__profile-card">
              <span className="my-dashboard__profile-label">Phone Number</span>
              <span className="my-dashboard__profile-value">{user?.phone || '-'}</span>
            </div>
            <div className="my-dashboard__profile-card">
              <span className="my-dashboard__profile-label">First Name</span>
              <span className="my-dashboard__profile-value">{user?.first_name || '-'}</span>
            </div>
            <div className="my-dashboard__profile-card">
              <span className="my-dashboard__profile-label">Last Name</span>
              <span className="my-dashboard__profile-value">{user?.last_name || '-'}</span>
            </div>
            <div className="my-dashboard__profile-card">
              <span className="my-dashboard__profile-label">Member Since</span>
              <span className="my-dashboard__profile-value">
                {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : '-'}
              </span>
            </div>
            <div className="my-dashboard__profile-card">
              <span className="my-dashboard__profile-label">Email</span>
              <span className="my-dashboard__profile-value">{user?.email || '-'}</span>
            </div>
          </div>
        ) : (
          <div className="my-dashboard__profile-edit">
            {msg && (
              <p className={`profile-msg profile-msg--${msg.type}`}>{msg.text}</p>
            )}
            <div className="my-dashboard__profile-grid">
              <div className="my-dashboard__profile-card">
                <label className="my-dashboard__profile-label" htmlFor="edit-username">Username</label>
                <input
                  id="edit-username"
                  type="text"
                  className="my-dashboard__profile-input"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                />
              </div>
              <div className="my-dashboard__profile-card">
                <label className="my-dashboard__profile-label" htmlFor="edit-phone">Phone Number</label>
                <input
                  id="edit-phone"
                  type="tel"
                  className="my-dashboard__profile-input"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
              <div className="my-dashboard__profile-card">
                <label className="my-dashboard__profile-label" htmlFor="edit-first-name">First Name</label>
                <input
                  id="edit-first-name"
                  type="text"
                  className="my-dashboard__profile-input"
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                />
              </div>
              <div className="my-dashboard__profile-card">
                <label className="my-dashboard__profile-label" htmlFor="edit-last-name">Last Name</label>
                <input
                  id="edit-last-name"
                  type="text"
                  className="my-dashboard__profile-input"
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                />
              </div>
              <div className="my-dashboard__profile-card">
                <label className="my-dashboard__profile-label">Member Since</label>
                <span className="my-dashboard__profile-value">
                  {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : '-'}
                </span>
              </div>
              <div className="my-dashboard__profile-card">
                <label className="my-dashboard__profile-label">Email</label>
                <span className="my-dashboard__profile-value">{user?.email || '-'}</span>
              </div>
              <div className="my-dashboard__profile-card">
                <label className="my-dashboard__profile-label">Password</label>
                <button
                  type="button"
                  className="btn btn-outline btn-pill my-dashboard__pw-btn"
                  onClick={() => { setPasswordMsg(null); setShowPasswordModal(true); }}
                >
                  Update Password
                </button>
              </div>
            </div>
            <div className="my-dashboard__profile-actions">
              <button className="btn btn-outline btn-pill" onClick={cancelEditing} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-pill my-dashboard__save-btn" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Subscription Management */}
      <div className="my-dashboard__section">
        <div className="my-dashboard__section-header">
          <h3 className="my-dashboard__section-title">Subscription</h3>
        </div>
        {isPaid ? (
          <div className="my-dashboard__subscription">
            <div className="my-dashboard__profile-grid">
              <div className="my-dashboard__profile-card">
                <span className="my-dashboard__profile-label">Plan</span>
                <span className="my-dashboard__profile-value">
                  <span className={`plan-badge plan-badge--${subscriptionPlan}`}>
                    {subscriptionPlan === 'plan_unlock' ? 'Plan Unlock' : 'Pro Care'}
                  </span>
                </span>
              </div>
              <div className="my-dashboard__profile-card">
                <span className="my-dashboard__profile-label">Billing</span>
                <span className="my-dashboard__profile-value">
                  {subscription?.billing_cycle === 'one_time' ? 'One-time purchase' : '$19.99/month'}
                </span>
              </div>
              {isPro && (
                <div className="my-dashboard__profile-card">
                  <span className="my-dashboard__profile-label">Next Renewal</span>
                  <span className="my-dashboard__profile-value">
                    {subscription?.current_period_end
                      ? new Date(subscription.current_period_end).toLocaleDateString()
                      : '-'}
                  </span>
                </div>
              )}
              <div className="my-dashboard__profile-card">
                <span className="my-dashboard__profile-label">Features</span>
                <span className="my-dashboard__profile-value">
                  {isPro
                    ? 'PDF, Calendar, Reminders, AI Chat'
                    : 'PDF, Calendar, Email Delivery'}
                </span>
              </div>
            </div>

            {subMsg && (
              <p className={`profile-msg profile-msg--${subMsg.type}`} style={{ marginTop: '1rem' }}>{subMsg.text}</p>
            )}

            <div className="my-dashboard__subscription-actions">
              {subscriptionPlan === 'plan_unlock' && (
                <button className="btn btn-primary btn-pill" onClick={() => navigate('/pricing')}>
                  Upgrade to Pro
                </button>
              )}
              {isPro && (
                <button
                  className="btn btn-outline btn-pill"
                  onClick={() => {
                    setCancelReason('');
                    setCancelConfirmText('');
                    setShowCancelModal(true);
                  }}
                  disabled={cancellingSubscription}
                >
                  {cancellingSubscription ? 'Cancelling...' : 'Cancel Pro'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="my-dashboard__subscription my-dashboard__subscription--inactive">
            <p>You&apos;re on the free plan. Upgrade to unlock PDF downloads, calendar export, AI chatbot, and more.</p>
            <button className="btn btn-primary btn-pill" onClick={() => navigate('/pricing')}>
              View Plans
            </button>
          </div>
        )}
      </div>

      {/* Vaccination Reminders */}
      {isPro && (
        <div className="my-dashboard__section">
          <h3 className="my-dashboard__section-title">Vaccination Reminders</h3>
          <ReminderSettings />
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content cancel-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="cancel-modal__title">Cancel Your Subscription</h3>
            <p className="cancel-modal__warning">
              You will lose access to PDF downloads, calendar export, reminders, AI assistant, and multi-pet dashboard.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (cancelConfirmText !== 'Cancel My Subscription') return;
                setCancellingSubscription(true);
                setSubMsg(null);
                try {
                  await subscriptionsApi.cancelSubscription(cancelReason || 'No reason provided');
                  await refreshUser();
                  setShowCancelModal(false);
                  setSubMsg({ type: 'success', text: 'Your subscription has been cancelled.' });
                } catch {
                  setSubMsg({ type: 'error', text: 'Failed to cancel subscription. Please try again.' });
                } finally {
                  setCancellingSubscription(false);
                }
              }}
            >
              <div className="form-group">
                <label htmlFor="cancel-reason">Why are you cancelling? (optional)</label>
                <textarea
                  id="cancel-reason"
                  className="input cancel-modal__textarea"
                  rows={3}
                  placeholder="Let us know how we can improve..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="cancel-confirm">
                  Type <strong>Cancel My Subscription</strong> to confirm
                </label>
                <input
                  id="cancel-confirm"
                  type="text"
                  className="input"
                  placeholder="Cancel My Subscription"
                  value={cancelConfirmText}
                  onChange={(e) => setCancelConfirmText(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="my-dashboard__modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowCancelModal(false)}
                >
                  Keep Subscription
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={cancelConfirmText !== 'Cancel My Subscription' || cancellingSubscription}
                >
                  {cancellingSubscription ? 'Cancelling...' : 'Cancel Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Change Password</h3>
            <form onSubmit={handlePasswordSave} className="profile-form">
              <div className="form-group">
                <label htmlFor="pw-old">Current Password</label>
                <input
                  id="pw-old"
                  type="password"
                  className="input"
                  value={passwordData.old_password}
                  onChange={(e) => setPasswordData(p => ({ ...p, old_password: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="pw-new">New Password</label>
                <input
                  id="pw-new"
                  type="password"
                  className="input"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData(p => ({ ...p, new_password: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="pw-confirm">Confirm New Password</label>
                <input
                  id="pw-confirm"
                  type="password"
                  className="input"
                  value={passwordData.new_password_confirm}
                  onChange={(e) => setPasswordData(p => ({ ...p, new_password_confirm: e.target.value }))}
                  required
                />
              </div>
              {passwordMsg && (
                <p className={`profile-msg profile-msg--${passwordMsg.type}`}>{passwordMsg.text}</p>
              )}
              <div className="my-dashboard__modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={passwordSaving}>
                  {passwordSaving ? 'Saving...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageTransition>
  );
}

export default MyDashboardPage;
