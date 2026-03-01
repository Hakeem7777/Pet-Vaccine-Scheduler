import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
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
  const { isAuthenticated, isPaid, refreshUser } = useAuth();
  const [plans, setPlans] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [{ isPending: isPayPalPending }] = usePayPalScriptReducer();

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

  // Pro Care: monthly PayPal subscription
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

  return (
      <PageTransition className="pricing-page">
        <button className="btn btn-outline btn-pill back-btn" onClick={() => navigate('/')}>
          &larr; Back
        </button>

        <div className="pricing-header">
          <h1>Your Dog Deserves a Smart Vaccine Plan</h1>
          <p>
            Generate a personalized vaccine schedule in minutes. Upgrade to Pro Care
            for PDF downloads, calendar sync, AI assistant, reminders, and more.
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
              <li className="pricing-feature pricing-feature--disabled">{X_ICON} No AI assistant</li>
              <li className="pricing-feature pricing-feature--disabled">{X_ICON} Contains ads</li>
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

          {/* Pro Care Plan */}
          <div className="pricing-card pricing-card--featured">
            <div className="pricing-card-badge">Most Popular</div>
            <div className="pricing-card-header">
              <h2>Pro Care Plan</h2>
              <div className="pricing-price">
                <span className="pricing-amount">$19.99</span>
                <span className="pricing-period">/month</span>
              </div>
              <p className="pricing-tagline">Complete care, zero stress</p>
            </div>
            <ul className="pricing-features">
              <li className="pricing-feature">{CHECK_ICON} Everything in Free</li>
              <li className="pricing-feature">{CHECK_ICON} Printable PDF vaccine schedule</li>
              <li className="pricing-feature">{CHECK_ICON} Add to Google, Apple &amp; Outlook calendars</li>
              <li className="pricing-feature">{CHECK_ICON} Email delivery of your plan</li>
              <li className="pricing-feature">{CHECK_ICON} Multi-pet dashboard</li>
              <li className="pricing-feature">{CHECK_ICON} Automated email reminders</li>
              <li className="pricing-feature">{CHECK_ICON} Vaccine history storage</li>
              <li className="pricing-feature">{CHECK_ICON} Schedule regeneration</li>
              <li className="pricing-feature">{CHECK_ICON} Priority guideline updates</li>
              <li className="pricing-feature">{CHECK_ICON} AI-powered vaccine assistant</li>
              <li className="pricing-feature">{CHECK_ICON} Ad-free experience</li>
            </ul>
            <div className="pricing-card-action">
              {!isAuthenticated ? (
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => navigate('/signup')}
                >
                  Sign Up &amp; Subscribe
                </button>
              ) : isPaid ? (
                <button className="btn btn-outline btn-block" disabled>
                  Current Plan
                </button>
              ) : processingPlan === 'pro' || isPayPalPending ? (
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
                  <th className="pricing-table--highlight">Pro Care</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Price</td>
                  <td>$0</td>
                  <td className="pricing-table--highlight">$19.99/month</td>
                </tr>
                <tr>
                  <td>Personalized vaccine schedule</td>
                  <td>{CHECK_ICON}</td>
                  <td className="pricing-table--highlight">{CHECK_ICON}</td>
                </tr>
                <tr>
                  <td>Core &amp; lifestyle recommendations</td>
                  <td>{CHECK_ICON}</td>
                  <td className="pricing-table--highlight">{CHECK_ICON}</td>
                </tr>
                <tr>
                  <td>Plain-language explanations</td>
                  <td>{CHECK_ICON}</td>
                  <td className="pricing-table--highlight">{CHECK_ICON}</td>
                </tr>
                <tr>
                  <td>PDF exports</td>
                  <td>0</td>
                  <td className="pricing-table--highlight">Unlimited</td>
                </tr>
                <tr>
                  <td>Calendar export (Google, Apple, Outlook)</td>
                  <td>{X_ICON}</td>
                  <td className="pricing-table--highlight">{CHECK_ICON}</td>
                </tr>
                <tr>
                  <td>Email delivery of plan</td>
                  <td>{X_ICON}</td>
                  <td className="pricing-table--highlight">{CHECK_ICON}</td>
                </tr>
                <tr>
                  <td>Multi-pet dashboard</td>
                  <td>{X_ICON}</td>
                  <td className="pricing-table--highlight">{CHECK_ICON}</td>
                </tr>
                <tr>
                  <td>Automated email reminders</td>
                  <td>{X_ICON}</td>
                  <td className="pricing-table--highlight">{CHECK_ICON}</td>
                </tr>
                <tr>
                  <td>Vaccine history storage</td>
                  <td>{X_ICON}</td>
                  <td className="pricing-table--highlight">{CHECK_ICON}</td>
                </tr>
                <tr>
                  <td>Schedule regeneration</td>
                  <td>{X_ICON}</td>
                  <td className="pricing-table--highlight">{CHECK_ICON}</td>
                </tr>
                <tr>
                  <td>Priority guideline updates</td>
                  <td>{X_ICON}</td>
                  <td className="pricing-table--highlight">{CHECK_ICON}</td>
                </tr>
                <tr>
                  <td>AI vaccine assistant</td>
                  <td>{X_ICON}</td>
                  <td className="pricing-table--highlight">{CHECK_ICON}</td>
                </tr>
                <tr>
                  <td>Ad-free experience</td>
                  <td>{X_ICON}</td>
                  <td className="pricing-table--highlight">{CHECK_ICON}</td>
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
                can view it on screen anytime. Upgrade to Pro Care to download, print,
                or export it.
              </p>
            </div>
            <div className="pricing-faq-item">
              <h3>What is Pro Care?</h3>
              <p>
                Pro Care is a monthly subscription at $19.99/month that unlocks
                every feature including PDF downloads, calendar sync, email reminders,
                multi-pet support, and our AI vaccine assistant.
              </p>
            </div>
            <div className="pricing-faq-item">
              <h3>Can I cancel anytime?</h3>
              <p>
                Absolutely. You can cancel your Pro Care subscription at any time
                from your account settings. No long-term commitment required.
              </p>
            </div>
            <div className="pricing-faq-item">
              <h3>What happens if I cancel?</h3>
              <p>
                When you cancel, you&apos;ll revert to the Free plan. You&apos;ll keep access
                to your on-screen schedule but will lose PDF downloads, calendar
                export, reminders, and AI assistant access.
              </p>
            </div>
          </div>
        </div>
      </PageTransition>
  );
}

export default PricingPage;
