import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useGuestStore from '../../store/useGuestStore';
import useTourStore from '../../store/useTourStore';

function Header() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, isGuestMode, exitGuestMode } = useAuth();
  const { guestDog, clearGuestData } = useGuestStore();
  const { startTour, isRunning } = useTourStore();

  function handleGuestLogout() {
    if (window.confirm('This will clear your guest data. Are you sure?')) {
      clearGuestData();
      exitGuestMode();
      navigate('/');
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
        <Link to="/" className="header-brand-link">
          <img
            src="/logoBanner.png"
            alt="Pet Vaccine Planner"
            className="header-logo"
          />
        </Link>
      </div>
      <nav className="header-nav">
        {isAuthenticated && (
          <button
            className="tour-trigger-btn"
            onClick={() => startTour('dashboard')}
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
        <Link to="/faq" className="header-nav-link" data-tour="faq-link">
          FAQ
        </Link>
      </nav>
      <div className="header-user">
        {isAuthenticated ? (
          <>
            <span className="user-name">
              {user.first_name || user.username}
              {user.clinic_name && ` - ${user.clinic_name}`}
            </span>
            <button onClick={logout} className="btn btn-outline">
              Logout
            </button>
          </>
        ) : isGuestMode && guestDog ? (
          <>
            <span className="user-name guest-label">Guest Mode</span>
            <Link to="/login" className="btn btn-outline">
              Login
            </Link>
            <Link to="/register" className="btn btn-primary">
              Sign Up
            </Link>
            <button onClick={handleGuestLogout} className="btn btn-outline btn-sm">
              Clear Data
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-outline">
              Login
            </Link>
            <Link to="/register" className="btn btn-primary">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </motion.header>
  );
}

export default Header;
