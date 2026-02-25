import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { useAuth } from '../context/AuthContext';
import * as subscriptionsApi from '../api/subscriptions';
import PageTransition from '../components/common/PageTransition';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './PricingPage.css';

const CHECK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const X_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function PricingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isPaid, isPro, subscriptionPlan, refreshUser } = useAuth();
  const [plans, setPlans] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingPlan, setProcessingPlan] = useState(null);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      const data = await subscriptionsApi.getPlans();
      setPlans(data);
    } catch {
      setError('Failed to load plans. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // Plan Unlock: one-time PayPal order
  async function handlePlanUnlockApprove(data) {
    setProcessingPlan('plan_unlock');
    setError(null);
    try {
      await subscriptionsApi.createOneTimePayment(data.orderID);
      await refreshUser();
      navigate('/home');
    } catch {
      setError('Failed to activate your plan. Please contact support.');
    } finally {
      setProcessingPlan(null);
    }
  }

  // Pro: annual PayPal subscription
  async function handleProApprove(data) {
    setProcessingPlan('pro');
    setError(null);
    try {
      await subscriptionsApi.createSubscription({
        subscription_id: data.subscriptionID,
      });
      await refreshUser();
      navigate('/home');
    } catch {
      setError('Failed to activate your subscription. Please contact support.');
    } finally {
      setProcessingPlan(null);
    }
  }

  if (isLoading) {
    return (
      <div className="page-loading">
        <LoadingSpinner />
      </div>
    );
  }

  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test';

  return (
    <PageTransition className="pricing-page">
      <button className="btn btn-outline btn-pill back-btn" onClick={() => navigate('/')}>
        &larr; Back
      </button>

      <div className="pricing-header">
        <h1>Your Dog Deserves a Smart Vaccine Plan</h1>
        <p>
          Generate a personalized vaccine schedule in minutes. Upgrade to unlock
          PDF downloads, calendar sync, reminders, and more.
        </p>
      </div>

      {error && (
        <div className="error-message" style={{ marginBottom: '1.5rem' }}>
          {error}
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setError(null)}
            style={{ marginLeft: '1rem' }}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="pricing-cards">
        {/* Free Tier */}
        <div className="pricing-card">
          <div className="pricing-card-header">
            <h2>Free</h2>
            <div className="pricing-price">
              <span className="pricing-amount">$0</span>
              <span className="pricing-period">forever</span>
            </div>
            <p className="pricing-tagline">See what your dog needs</p>
          </div>
          <ul className="pricing-features">
            <li className="pricing-feature">{CHECK_ICON} 1 personalized vaccine schedule</li>
            <li className="pricing-feature">{CHECK_ICON} On-screen timeline view</li>
            <li className="pricing-feature">{CHECK_ICON} Core &amp; lifestyle recommendations</li>
            <li className="pricing-feature">{CHECK_ICON} Plain-language explanations</li>
            <li className="pricing-feature pricing-feature--disabled">{X_ICON} No PDF download</li>
            <li className="pricing-feature pricing-feature--disabled">{X_ICON} No calendar export</li>
            <li className="pricing-feature pricing-feature--disabled">{X_ICON} No reminders</li>
          </ul>
          <div className="pricing-card-action">
            {isAuthenticated ? (
              <button
                className="btn btn-outline btn-block"
                onClick={() => navigate('/home')}
              >
                {isPaid ? 'Go to Dashboard' : 'Current Plan'}
              </button>
            ) : (
              <button
                className="btn btn-outline btn-block"
                onClick={() => navigate('/signup')}
              >
                Generate Free Schedule
              </button>
            )}
          </div>
        </div>

        {/* Plan Unlock - Most Popular */}
        <div className="pricing-card pricing-card--featured">
          <div className="pricing-card-badge">Most Popular</div>
          <div className="pricing-card-header">
            <h2>Plan Unlock</h2>
            <div className="pricing-price">
              <span className="pricing-amount">$19.99</span>
              <span className="pricing-period">one-time</span>
            </div>
            <p className="pricing-tagline">Download, share &amp; manage</p>
          </div>
          <ul className="pricing-features">
            <li className="pricing-feature">{CHECK_ICON} Everything in Free</li>
            <li className="pricing-feature">{CHECK_ICON} Printable PDF vaccine schedule</li>
            <li className="pricing-feature">{CHECK_ICON} Add to Google, Apple &amp; Outlook calendars</li>
            <li className="pricing-feature">{CHECK_ICON} Email delivery of your plan</li>
            <li className="pricing-feature">{CHECK_ICON} Unlimited re-downloads</li>
            <li className="pricing-feature">{CHECK_ICON} Multi-pet dashboard</li>
            <li className="pricing-feature pricing-feature--disabled">{X_ICON} No AI vaccine assistant</li>
          </ul>
          <div className="pricing-card-action">
            {!isAuthenticated ? (
              <button
                className="btn btn-primary btn-block"
                onClick={() => navigate('/signup')}
              >
                Sign Up &amp; Unlock
              </button>
            ) : subscriptionPlan === 'plan_unlock' ? (
              <button className="btn btn-outline btn-block" disabled>
                Unlocked
              </button>
            ) : isPro ? (
              <button className="btn btn-outline btn-block" disabled>
                Included in Pro
              </button>
            ) : processingPlan === 'plan_unlock' ? (
              <LoadingSpinner />
            ) : (
              <PayPalScriptProvider
                options={{
                  'client-id': paypalClientId,
                  intent: 'capture',
                  currency: 'USD',
                }}
              >
                <PayPalButtons
                  style={{ layout: 'vertical', label: 'pay', shape: 'pill', color: 'gold' }}
                  createOrder={(data, actions) => {
                    return actions.order.create({
                      purchase_units: [
                        {
                          amount: { value: '19.99', currency_code: 'USD' },
                          description: 'PetVax Plan Unlock - One-Time Payment',
                        },
                      ],
                    });
                  }}
                  onApprove={async (data, actions) => {
                    await actions.order.capture();
                    await handlePlanUnlockApprove(data);
                  }}
                  onError={() =>
                    setError('PayPal encountered an error. Please try again.')
                  }
                />
              </PayPalScriptProvider>
            )}
          </div>
        </div>

        {/* Pro Care Plan */}
        <div className="pricing-card">
          <div className="pricing-card-header">
            <h2>Pro Care Plan</h2>
            <div className="pricing-price">
              <span className="pricing-amount">$29</span>
              <span className="pricing-period">/year</span>
            </div>
            <p className="pricing-tagline">Ongoing protection, zero stress</p>
          </div>
          <ul className="pricing-features">
            <li className="pricing-feature">{CHECK_ICON} Everything in Plan Unlock</li>
            <li className="pricing-feature">{CHECK_ICON} Automated email reminders</li>
            <li className="pricing-feature">{CHECK_ICON} Vaccine history storage</li>
            <li className="pricing-feature">{CHECK_ICON} Multi-pet profiles</li>
            <li className="pricing-feature">{CHECK_ICON} Yearly schedule regeneration</li>
            <li className="pricing-feature">{CHECK_ICON} Priority guideline updates</li>
            <li className="pricing-feature">{CHECK_ICON} AI-powered vaccine assistant</li>
          </ul>
          <div className="pricing-card-action">
            {!isAuthenticated ? (
              <button
                className="btn btn-primary btn-block"
                onClick={() => navigate('/signup')}
              >
                Sign Up &amp; Subscribe
              </button>
            ) : isPro ? (
              <button className="btn btn-outline btn-block" disabled>
                Current Plan
              </button>
            ) : processingPlan === 'pro' ? (
              <LoadingSpinner />
            ) : (
              <PayPalButtons
                style={{ layout: 'vertical', label: 'subscribe', shape: 'pill', color: 'gold' }}
                createSubscription={(data, actions) => {
                  return actions.subscription.create({
                    plan_id: plans?.pro?.paypal_plan_id || '',
                  });
                }}
                onApprove={(data) => handleProApprove(data)}
                onError={() =>
                  setError('PayPal encountered an error. Please try again.')
                }
              />
            )}
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="pricing-comparison">
        <h2>Compare Plans</h2>
        <div className="pricing-table-wrapper">
          <table className="pricing-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Free</th>
                <th className="pricing-table--highlight">Plan Unlock</th>
                <th>Pro Care</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Price</td>
                <td>$0</td>
                <td className="pricing-table--highlight">$19.99 one-time</td>
                <td>$29/year</td>
              </tr>
              <tr>
                <td>Personalized vaccine schedule</td>
                <td>{CHECK_ICON}</td>
                <td className="pricing-table--highlight">{CHECK_ICON}</td>
                <td>{CHECK_ICON}</td>
              </tr>
              <tr>
                <td>Core &amp; lifestyle recommendations</td>
                <td>{CHECK_ICON}</td>
                <td className="pricing-table--highlight">{CHECK_ICON}</td>
                <td>{CHECK_ICON}</td>
              </tr>
              <tr>
                <td>Plain-language explanations</td>
                <td>{CHECK_ICON}</td>
                <td className="pricing-table--highlight">{CHECK_ICON}</td>
                <td>{CHECK_ICON}</td>
              </tr>
              <tr>
                <td>Printable PDF schedule</td>
                <td>{X_ICON}</td>
                <td className="pricing-table--highlight">{CHECK_ICON}</td>
                <td>{CHECK_ICON}</td>
              </tr>
              <tr>
                <td>Calendar export (Google, Apple, Outlook)</td>
                <td>{X_ICON}</td>
                <td className="pricing-table--highlight">{CHECK_ICON}</td>
                <td>{CHECK_ICON}</td>
              </tr>
              <tr>
                <td>Email delivery of plan</td>
                <td>{X_ICON}</td>
                <td className="pricing-table--highlight">{CHECK_ICON}</td>
                <td>{CHECK_ICON}</td>
              </tr>
              <tr>
                <td>Multi-pet dashboard</td>
                <td>{X_ICON}</td>
                <td className="pricing-table--highlight">{CHECK_ICON}</td>
                <td>{CHECK_ICON}</td>
              </tr>
              <tr>
                <td>AI vaccine assistant</td>
                <td>{X_ICON}</td>
                <td className="pricing-table--highlight">{X_ICON}</td>
                <td>{CHECK_ICON}</td>
              </tr>
              <tr>
                <td>Automated email reminders</td>
                <td>{X_ICON}</td>
                <td className="pricing-table--highlight">{X_ICON}</td>
                <td>{CHECK_ICON}</td>
              </tr>
              <tr>
                <td>Vaccine history storage</td>
                <td>{X_ICON}</td>
                <td className="pricing-table--highlight">{X_ICON}</td>
                <td>{CHECK_ICON}</td>
              </tr>
              <tr>
                <td>Yearly schedule regeneration</td>
                <td>{X_ICON}</td>
                <td className="pricing-table--highlight">{X_ICON}</td>
                <td>{CHECK_ICON}</td>
              </tr>
              <tr>
                <td>Priority guideline updates</td>
                <td>{X_ICON}</td>
                <td className="pricing-table--highlight">{X_ICON}</td>
                <td>{CHECK_ICON}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="pricing-faq">
        <h2>Frequently Asked Questions</h2>
        <div className="pricing-faq-grid">
          <div className="pricing-faq-item">
            <h3>Is the free schedule really free?</h3>
            <p>
              Yes! Generate a full, personalized vaccine schedule at no cost. You
              can view it on screen anytime. Upgrade to download, print, or
              export it.
            </p>
          </div>
          <div className="pricing-faq-item">
            <h3>What does &quot;one-time&quot; mean?</h3>
            <p>
              Plan Unlock is a single $19.99 payment - no subscription, no
              recurring charges. You keep access to all unlocked features
              forever.
            </p>
          </div>
          <div className="pricing-faq-item">
            <h3>Can I upgrade from Plan Unlock to Pro later?</h3>
            <p>
              Absolutely. You can upgrade to Pro at any time to add automated
              reminders, vaccine history, and yearly schedule regeneration.
            </p>
          </div>
          <div className="pricing-faq-item">
            <h3>What happens if I cancel Pro?</h3>
            <p>
              You keep all Plan Unlock features (PDF, calendar export, email
              delivery). You only lose Pro-specific features like AI assistant,
              automated reminders, and history storage.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

export default PricingPage;
