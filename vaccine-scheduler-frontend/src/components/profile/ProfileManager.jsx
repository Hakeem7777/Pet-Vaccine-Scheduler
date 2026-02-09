import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as authApi from '../../api/auth';
import './ProfileManager.css';

function ProfileManager() {
  const { user, refreshUser } = useAuth();

  // Username state
  const [username, setUsername] = useState(user?.username || '');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState(null);

  // Email state
  const [email, setEmail] = useState(user?.email || '');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState(null);

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);

  async function handleUsernameSubmit(e) {
    e.preventDefault();
    if (!username.trim()) return;
    setUsernameLoading(true);
    setUsernameMsg(null);
    try {
      await authApi.updateProfile({ username: username.trim() });
      await refreshUser();
      setUsernameMsg({ type: 'success', text: 'Username updated successfully.' });
    } catch (err) {
      const detail = err.response?.data?.username?.[0] || err.response?.data?.detail || 'Failed to update username.';
      setUsernameMsg({ type: 'error', text: detail });
    } finally {
      setUsernameLoading(false);
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setEmailLoading(true);
    setEmailMsg(null);
    try {
      await authApi.updateProfile({ email: email.trim() });
      await refreshUser();
      setEmailMsg({ type: 'success', text: 'Email updated successfully.' });
    } catch (err) {
      const detail = err.response?.data?.email?.[0] || err.response?.data?.detail || 'Failed to update email.';
      setEmailMsg({ type: 'error', text: detail });
    } finally {
      setEmailLoading(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setPasswordLoading(true);
    setPasswordMsg(null);
    try {
      await authApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
    } catch (err) {
      const detail =
        err.response?.data?.old_password?.[0] ||
        err.response?.data?.new_password?.[0] ||
        err.response?.data?.new_password_confirm?.[0] ||
        err.response?.data?.detail ||
        'Failed to change password.';
      setPasswordMsg({ type: 'error', text: detail });
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="profile-manager">
      <div className="profile-section">
        <h4 className="profile-section__title">Change Username</h4>
        <form onSubmit={handleUsernameSubmit} className="profile-form">
          <div className="form-group">
            <label htmlFor="profile-username">Username</label>
            <input
              id="profile-username"
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          {usernameMsg && (
            <p className={`profile-msg profile-msg--${usernameMsg.type}`}>{usernameMsg.text}</p>
          )}
          <button type="submit" className="btn btn-primary btn-sm" disabled={usernameLoading}>
            {usernameLoading ? 'Saving...' : 'Update Username'}
          </button>
        </form>
      </div>

      <div className="profile-section">
        <h4 className="profile-section__title">Change Email</h4>
        <form onSubmit={handleEmailSubmit} className="profile-form">
          <div className="form-group">
            <label htmlFor="profile-email">Email</label>
            <input
              id="profile-email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {emailMsg && (
            <p className={`profile-msg profile-msg--${emailMsg.type}`}>{emailMsg.text}</p>
          )}
          <button type="submit" className="btn btn-primary btn-sm" disabled={emailLoading}>
            {emailLoading ? 'Saving...' : 'Update Email'}
          </button>
        </form>
      </div>

      <div className="profile-section">
        <h4 className="profile-section__title">Change Password</h4>
        <form onSubmit={handlePasswordSubmit} className="profile-form">
          <div className="form-group">
            <label htmlFor="profile-old-password">Current Password</label>
            <input
              id="profile-old-password"
              type="password"
              className="input"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-new-password">New Password</label>
            <input
              id="profile-new-password"
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-confirm-password">Confirm New Password</label>
            <input
              id="profile-confirm-password"
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {passwordMsg && (
            <p className={`profile-msg profile-msg--${passwordMsg.type}`}>{passwordMsg.text}</p>
          )}
          <button type="submit" className="btn btn-primary btn-sm" disabled={passwordLoading}>
            {passwordLoading ? 'Saving...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProfileManager;
