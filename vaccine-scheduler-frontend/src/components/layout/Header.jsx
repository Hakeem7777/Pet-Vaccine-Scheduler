import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useGuestStore from '../../store/useGuestStore';

function Header() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, isGuestMode, exitGuestMode } = useAuth();
  const { guestDog, clearGuestData } = useGuestStore();

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
        <Link to="/faq" className="header-nav-link">
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
