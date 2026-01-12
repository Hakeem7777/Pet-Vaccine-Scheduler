import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DogDetailPage from './pages/DogDetailPage';
import FAQPage from './pages/FAQPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';

function App() {
  const location = useLocation();

  return (
    <AuthProvider>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* FAQ page - public, standalone */}
          <Route path="/faq" element={<FAQPage />} />

          {/* Legal pages - public, standalone */}
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          {/* Main app routes - Dashboard is public, detail page is protected */}
          <Route
            element={
              <ChatProvider>
                <Layout />
              </ChatProvider>
            }
          >
            {/* Dashboard is accessible to everyone (guest + authenticated) */}
            <Route path="/" element={<DashboardPage />} />

            {/* Dog detail requires authentication (or guest mode with guest dog) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dogs/:dogId" element={<DogDetailPage />} />
            </Route>
          </Route>
        </Routes>
      </AnimatePresence>
    </AuthProvider>
  );
}

export default App;
