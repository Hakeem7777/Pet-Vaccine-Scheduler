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

import BlogsPage from './pages/BlogsPage';
import BlogDetailPage from './pages/BlogDetailPage';

import HelpPage from './pages/HelpPage';
import HelpVideoDetailPage from './pages/HelpVideoDetailPage';

import NotFoundPage from './pages/NotFoundPage';

import LandingPageB2C from './pages/LandingPageB2C';
import LandingPageB2B from './pages/LandingPageB2B';

/*
 * Pinterest conversion landing page
 */
import PinterestLandingPage from './pages/PinterestLandingPage';

import SubscriptionConfirmationPage from './pages/SubscriptionConfirmationPage';

import ScrollToTop from './components/common/ScrollToTop';


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

          <ScrollToTop />

          <AnimatePresence mode="wait">

            <Routes
              location={location}
              key={location.pathname}
            >

              {/* =====================================================
                  LANDING PAGES
              ====================================================== */}

              <Route
                path="/"
                element={<LandingPageB2C />}
              />

              <Route
                path="/for-clinics"
                element={<LandingPageB2B />}
              />

              {/* Pinterest conversion landing page */}
              <Route
                path="/free-dog-vaccine-schedule"
                element={<PinterestLandingPage />}
              />

              {/* =====================================================
                  AUTH ROUTES
              ====================================================== */}

              <Route
                path="/login"
                element={<LoginPage />}
              />

              <Route
                path="/signup"
                element={<RegisterPage />}
              />

              <Route
                path="/register"
                element={
                  <Navigate
                    to="/signup"
                    replace
                  />
                }
              />

              <Route
                path="/verify-otp"
                element={<VerifyOTPPage />}
              />

              <Route
                path="/forgot-password"
                element={<ForgotPasswordPage />}
              />

              <Route
                path="/reset-password"
                element={<ResetPasswordPage />}
              />


              {/* =====================================================
                  PUBLIC STANDALONE PAGES
              ====================================================== */}

              <Route
                path="/faq"
                element={<FAQPage />}
              />

              <Route
                path="/terms"
                element={<TermsPage />}
              />

              <Route
                path="/privacy"
                element={<PrivacyPage />}
              />

              <Route
                path="/contact"
                element={<ContactPage />}
              />


              {/* =====================================================
                  MAIN APP ROUTES
              ====================================================== */}

              <Route
                element={
                  <ChatProvider>
                    <Layout />
                  </ChatProvider>
                }
              >

                {/* Public home/dashboard */}
                <Route
                  path="/home"
                  element={<DashboardPage />}
                />


                {/* Pricing */}
                <Route
                  path="/pricing"
                  element={<PricingPage />}
                />


                {/* Blog */}
                <Route
                  path="/blogs"
                  element={<BlogsPage />}
                />

                <Route
                  path="/blogs/:slug"
                  element={<BlogDetailPage />}
                />


                {/* Help videos */}
                <Route
                  path="/help"
                  element={<HelpPage />}
                />

                <Route
                  path="/help/:slug"
                  element={<HelpVideoDetailPage />}
                />


                {/* =================================================
                    PROTECTED USER ROUTES
                ================================================== */}

                <Route element={<ProtectedRoute />}>

                  <Route
                    path="/dashboard"
                    element={<MyDashboardPage />}
                  />

                  <Route
                    path="/dogs/:dogId"
                    element={<DogDetailPage />}
                  />

                  <Route
                    path="/subscription-confirmation"
                    element={<SubscriptionConfirmationPage />}
                  />

                </Route>


                {/* =================================================
                    ADMIN ROUTES
                ================================================== */}

                <Route element={<AdminRoute />}>

                  <Route
                    path="/admin-panel"
                    element={<AdminDashboardPage />}
                  />

                </Route>

              </Route>


              {/* =====================================================
                  404 CATCH-ALL
              ====================================================== */}

              <Route
                path="*"
                element={<NotFoundPage />}
              />

            </Routes>

          </AnimatePresence>

        </AuthProvider>

      </PayPalScriptProvider>

    </ErrorBoundary>
  );
}


export default App;
