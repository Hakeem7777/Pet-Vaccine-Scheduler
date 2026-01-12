import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

function ProtectedRoute() {
  const { isAuthenticated, isLoading, isGuestMode } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-container">
        <LoadingSpinner />
      </div>
    );
  }

  // Allow access if authenticated OR in guest mode
  if (!isAuthenticated && !isGuestMode) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
