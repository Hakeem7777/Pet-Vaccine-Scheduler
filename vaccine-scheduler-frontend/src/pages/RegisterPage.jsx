import { useNavigate } from 'react-router-dom';
import RegisterForm from '../components/auth/RegisterForm';
import PageTransition from '../components/common/PageTransition';
import Footer from '../components/layout/Footer';

function RegisterPage() {
  const navigate = useNavigate();

  function handleSuccess() {
    navigate('/');
  }

  return (
    <div className="app-layout">
      <PageTransition className="auth-page">
        <RegisterForm onSuccess={handleSuccess} />
      </PageTransition>
      <Footer />
    </div>
  );
}

export default RegisterPage;
