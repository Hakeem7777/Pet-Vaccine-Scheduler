import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import PageTransition from '../components/common/PageTransition';
import './SubscriptionConfirmationPage.css';

const FEATURES = [
  'Unlimited PDF exports',
  'Calendar sync (Google, Apple, Outlook)',
  'Automated email reminders',
  'Multi-pet dashboard',
  'AI-powered vaccine assistant',
  'Ad-free experience',
];

const BRAND_COLORS = ['#006D9C', '#2AB57F', '#FF9C3B'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 1.0 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

const featureListVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.3 },
  },
};

const featureItemVariants = {
  hidden: { opacity: 0, x: -15 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

function SubscriptionConfirmationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const [stripeReady, setStripeReady] = useState(false);

  const isStripeReturn = searchParams.has('session_id');
  const state = location.state || (isStripeReturn ? {
    plan: 'Pro Care Plan',
    price: '$19.99',
    billingCycle: 'monthly',
    isPromo: false,
  } : null);

  // Refresh user data on Stripe redirect return
  useEffect(() => {
    if (isStripeReturn && !stripeReady) {
      refreshUser().then(() => setStripeReady(true));
    }
  }, [isStripeReturn, stripeReady, refreshUser]);

  const fireConfetti = useCallback(() => {
    // Initial burst from center
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: BRAND_COLORS,
    });

    // Side cannons after a short delay
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: BRAND_COLORS,
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors: BRAND_COLORS,
      });
    }, 300);

    // Final shower
    setTimeout(() => {
      confetti({
        particleCount: 40,
        spread: 100,
        origin: { y: 0.35 },
        colors: BRAND_COLORS,
        gravity: 1.2,
      });
    }, 700);
  }, []);

  useEffect(() => {
    if (!state) {
      navigate('/home', { replace: true });
      return;
    }
    // Fire confetti after checkmark animation completes
    const timer = setTimeout(fireConfetti, 900);
    return () => clearTimeout(timer);
  }, [state, navigate, fireConfetti]);

  if (!state) return null;

  const { plan, price, billingCycle, isPromo } = state;

  return (
    <PageTransition className="confirmation-page">
      {/* Animated checkmark */}
      <motion.div
        className="confirmation-icon"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.2 }}
      >
        <svg viewBox="0 0 52 52" className="confirmation-checkmark-svg">
          <motion.circle
            cx="26"
            cy="26"
            r="24"
            fill="none"
            stroke="var(--color-secondary)"
            strokeWidth="2.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.35, ease: 'easeInOut' }}
          />
          <motion.path
            d="M15 27l7 7 15-15"
            fill="none"
            stroke="var(--color-secondary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.75, ease: 'easeOut' }}
          />
        </svg>
      </motion.div>

      {/* Staggered content */}
      <motion.div
        className="confirmation-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1 className="confirmation-title" variants={itemVariants}>
          Welcome to Pro Care!
        </motion.h1>

        <motion.p className="confirmation-subtitle" variants={itemVariants}>
          Your subscription is now active. A confirmation email has been sent to your inbox.
        </motion.p>

        {/* Details card */}
        <motion.div className="confirmation-card" variants={itemVariants}>
          <div className="confirmation-card-header">
            <h2>Subscription Details</h2>
            <motion.span
              className="confirmation-status-badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 1.6 }}
            >
              Active
            </motion.span>
          </div>
          <div className="confirmation-details">
            <div className="confirmation-detail-row">
              <span className="confirmation-detail-label">Plan</span>
              <span className="confirmation-detail-value">{plan || 'Pro Care Plan'}</span>
            </div>
            <div className="confirmation-detail-row">
              <span className="confirmation-detail-label">Price</span>
              <span className="confirmation-detail-value">
                {isPromo ? 'Free (Promo Code)' : `${price || '$19.99'}/month`}
              </span>
            </div>
            <div className="confirmation-detail-row">
              <span className="confirmation-detail-label">Billing</span>
              <span className="confirmation-detail-value">
                {isPromo ? 'Promo' : billingCycle === 'monthly' ? 'Monthly' : billingCycle}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Features unlocked */}
        <motion.div className="confirmation-features" variants={itemVariants}>
          <h3>Features Now Unlocked</h3>
          <motion.ul
            variants={featureListVariants}
            initial="hidden"
            animate="visible"
          >
            {FEATURES.map((feature) => (
              <motion.li key={feature} variants={featureItemVariants}>
                <svg viewBox="0 0 24 24" fill="none" className="confirmation-feature-check">
                  <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {feature}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        {/* CTA buttons */}
        <motion.div className="confirmation-actions" variants={itemVariants}>
          <Link to="/home" className="btn btn-primary confirmation-btn-primary">
            Go to Dashboard
          </Link>
          <Link to="/pricing" className="btn btn-outline confirmation-btn-secondary">
            View Pricing Details
          </Link>
        </motion.div>
      </motion.div>
    </PageTransition>
  );
}

export default SubscriptionConfirmationPage;
