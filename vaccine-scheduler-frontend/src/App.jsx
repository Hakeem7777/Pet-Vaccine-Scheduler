import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import ErrorBoundary from './components/ErrorBoundary';
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
import PricingPage from './pages/PricingPage';
import FAQPage from './pages/FAQPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ContactPage from './pages/ContactPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NotFoundPage from './pages/NotFoundPage';

const paypalOptions = {
  'client-id': import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test',
  vault: true,
  intent: 'subscription',
};

function App() {
  const location = useLocation();

  return (
    <ErrorBoundary>
    <PayPalScriptProvider options={paypalOptions}>
    <AuthProvider>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Redirect bare "/" to "/home" */}
          <Route path="/" element={<Navigate to="/home" replace />} />

          {/* Auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<RegisterPage />} />
          <Route path="/register" element={<Navigate to="/signup" replace />} />
          <Route path="/verify-otp" element={<VerifyOTPPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

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
            {/* Home is accessible to everyone (guest + authenticated) */}
            <Route path="/home" element={<DashboardPage />} />

            {/* Pricing page - public, with header/footer */}
            <Route path="/pricing" element={<PricingPage />} />

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

          {/* 404 catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AnimatePresence>
    </AuthProvider>
    </PayPalScriptProvider>
    </ErrorBoundary>
  );
}

export default App;
