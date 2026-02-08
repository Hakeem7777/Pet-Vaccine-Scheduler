import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import OTPVerificationForm from '../components/auth/OTPVerificationForm';
import PageTransition from '../components/common/PageTransition';
import Footer from '../components/layout/Footer';

function VerifyOTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  if (!email) {
    return <Navigate to="/register" replace />;
  }

  function handleSuccess() {
    navigate('/');
  }

  return (
    <div className="app-layout">
      <PageTransition className="auth-page">
        <OTPVerificationForm email={email} onSuccess={handleSuccess} />
      </PageTransition>
      <Footer />
    </div>
  );
}

export default VerifyOTPPage;
