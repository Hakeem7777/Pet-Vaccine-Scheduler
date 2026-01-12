import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
import PageTransition from '../components/common/PageTransition';
import Footer from '../components/layout/Footer';

function LoginPage() {
  const navigate = useNavigate();

  function handleSuccess() {
    navigate('/');
  }

  return (
    <div className="app-layout">
      <PageTransition className="auth-page">
        <LoginForm onSuccess={handleSuccess} />
      </PageTransition>
      <Footer />
    </div>
  );
}

export default LoginPage;
