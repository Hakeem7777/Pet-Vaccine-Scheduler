import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useGuestStore from '../../store/useGuestStore';
import useDogStore from '../../store/useDogStore';
import useTourStore from '../../store/useTourStore';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated, isAdmin, isGuestMode, exitGuestMode, isPaid, subscriptionPlan } = useAuth();
  const { guestDog, clearGuestData } = useGuestStore();
  const dogs = useDogStore((state) => state.dogs);
  const { startTour, isRunning } = useTourStore();

  // Determine which tour to start based on current page
  const getTourName = () => {
    if (location.pathname.startsWith('/dogs/')) {
      return 'dogDetail';
    }
    return 'dashboard';
  };

  // Only show tour button if user has dogs (on dashboard) or is on a dog detail page
  const canShowTour = location.pathname.startsWith('/dogs/') || (dogs && dogs.length > 0);

  function handleGuestLogout() {
    if (window.confirm('This will clear your guest data. Are you sure?')) {
      clearGuestData();
      exitGuestMode();
      navigate('/home');
    }
  }

  return (
    <motion.header
      className="header"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="header-brand">
        <Link to={isAdmin ? '/admin-panel' : '/home'} className="header-brand-link">
          <img
            src="/logoBanner.png"
            alt="Pet Vaccine Planner"
            className="header-logo"
          />
        </Link>
      </div>
      <nav className="header-nav">
        {isAuthenticated && !isAdmin && canShowTour && (
          <button
            className="tour-trigger-btn"
            onClick={() => startTour(getTourName())}
            disabled={isRunning}
            title="Take a guided tour"
          >
            <svg className="tour-trigger-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>Tour</span>
          </button>
        )}
        {isAuthenticated && !isAdmin && (
          <Link to="/dashboard" className="header-nav-link">
            Dashboard
          </Link>
        )}
        {isAuthenticated && isAdmin && (
          <Link to="/admin-panel" className="header-nav-link">
            Admin Panel
          </Link>
        )}
        {(!isAuthenticated || !isPaid) && !isAdmin && (
          <Link to="/pricing" className="header-nav-link">
            Pricing
          </Link>
        )}
        <Link to="/faq" className="header-nav-link" data-tour="faq-link">
          FAQs
        </Link>
      </nav>
      <div className="header-user">
        {isAuthenticated ? (
          <>
            <span className="user-name">
              {user.first_name || user.username}
              {user.clinic_name && ` - ${user.clinic_name}`}
              {isPaid && (
                <span className={`plan-badge plan-badge--${subscriptionPlan}`}>
                  {subscriptionPlan === 'plan_unlock' ? 'Unlocked' : 'Pro'}
                </span>
              )}
            </span>
            <button onClick={logout} className="btn btn-outline">
              Logout
            </button>
          </>
        ) : isGuestMode && guestDog ? (
          <>
            <span className="user-name guest-label">Guest Mode</span>
            <Link to="/signup" className="btn header-cta">
              Get Started
              <img src="/Images/dog_icon.svg" alt="" width="16" height="16" />
            </Link>
            <button onClick={handleGuestLogout} className="btn btn-outline btn-sm">
              Clear Data
            </button>
          </>
        ) : (
          <Link to="/signup" className="btn header-cta">
            Get Started
            <img src="/Images/dog_icon.svg" alt="" width="16" height="16" />
          </Link>
        )}
      </div>
    </motion.header>
  );
}

export default Header;
