import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyOTPPage from './pages/VerifyOTPPage';
import DashboardPage from './pages/DashboardPage';
import DogDetailPage from './pages/DogDetailPage';
import MyDashboardPage from './pages/MyDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import FAQPage from './pages/FAQPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ContactPage from './pages/ContactPage';

function App() {
  const location = useLocation();

  return (
    <AuthProvider>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<VerifyOTPPage />} />

          {/* FAQ page - public, standalone */}
          <Route path="/faq" element={<FAQPage />} />

          {/* Legal pages - public, standalone */}
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          {/* Contact page - public, standalone */}
          <Route path="/contact" element={<ContactPage />} />

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

            {/* Personal dashboard - requires authentication */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<MyDashboardPage />} />
              <Route path="/dogs/:dogId" element={<DogDetailPage />} />
            </Route>

            {/* Admin panel - only accessible to staff users */}
            <Route element={<AdminRoute />}>
              <Route path="/admin-panel" element={<AdminDashboardPage />} />
            </Route>
          </Route>
        </Routes>
      </AnimatePresence>
    </AuthProvider>
  );
}

export default App;
