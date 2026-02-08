import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats } from '../api/dashboard';
import ProfileManager from '../components/profile/ProfileManager';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageTransition from '../components/common/PageTransition';
import './MyDashboardPage.css';

function MyDashboardPage() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <PageTransition className="my-dashboard">
      <div className="page-header">
        <h2>Dashboard</h2>
        <div className="page-header-actions">
          <Link to="/" className="btn btn-primary">
            My Pets
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="my-dashboard__stats">
        <div className="my-dash-card my-dash-card--primary">
          <div className="my-dash-card__number">{stats?.dog_count ?? 0}</div>
          <div className="my-dash-card__label">Total Dogs</div>
        </div>
        <div className="my-dash-card my-dash-card--secondary">
          <div className="my-dash-card__number">{stats?.vaccination_count ?? 0}</div>
          <div className="my-dash-card__label">Total Vaccinations</div>
        </div>
      </div>

      {/* User Information */}
      <div className="my-dashboard__section">
        <h3 className="my-dashboard__section-title">Your Information</h3>
        <div className="my-dashboard__info-card">
          <div className="my-dashboard__info-grid">
            <div className="my-dashboard__info-item">
              <span className="my-dashboard__info-label">Username</span>
              <span className="my-dashboard__info-value">{user?.username || '-'}</span>
            </div>
            <div className="my-dashboard__info-item">
              <span className="my-dashboard__info-label">Email</span>
              <span className="my-dashboard__info-value">{user?.email || '-'}</span>
            </div>
            <div className="my-dashboard__info-item">
              <span className="my-dashboard__info-label">First Name</span>
              <span className="my-dashboard__info-value">{user?.first_name || '-'}</span>
            </div>
            <div className="my-dashboard__info-item">
              <span className="my-dashboard__info-label">Last Name</span>
              <span className="my-dashboard__info-value">{user?.last_name || '-'}</span>
            </div>
            <div className="my-dashboard__info-item">
              <span className="my-dashboard__info-label">Clinic</span>
              <span className="my-dashboard__info-value">{user?.clinic_name || '-'}</span>
            </div>
            <div className="my-dashboard__info-item">
              <span className="my-dashboard__info-label">Phone</span>
              <span className="my-dashboard__info-value">{user?.phone || '-'}</span>
            </div>
            <div className="my-dashboard__info-item">
              <span className="my-dashboard__info-label">Member Since</span>
              <span className="my-dashboard__info-value">
                {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Settings */}
      <div className="my-dashboard__section">
        <h3 className="my-dashboard__section-title">Profile Settings</h3>
        <div className="my-dashboard__info-card">
          <ProfileManager />
        </div>
      </div>
    </PageTransition>
  );
}

export default MyDashboardPage;
