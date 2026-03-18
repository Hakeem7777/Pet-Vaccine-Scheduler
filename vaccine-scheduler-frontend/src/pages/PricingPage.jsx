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

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState('stripe'); // 'stripe' or 'paypal'
  const [stripeLoading, setStripeLoading] = useState(false);

  // Promo code state
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState(null);
  const [promoSuccess, setPromoSuccess] = useState(null);

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
      navigate('/subscription-confirmation', {
        state: {
          plan: 'Pro Care Plan',
          price: '$19.99',
          billingCycle: 'monthly',
          isPromo: false,
        },
      });
    } catch {
      setError('Failed to activate your subscription. Please contact support.');
    } finally {
      setProcessingPlan(null);
    }
  }

  // Pro Care: Stripe Checkout
  async function handleStripeCheckout() {
    setStripeLoading(true);
    setError(null);
    try {
      const currentUrl = window.location.origin;
      const { checkout_url } = await subscriptionsApi.createStripeCheckout({
        success_url: `${currentUrl}/subscription-confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${currentUrl}/pricing`,
      });
      window.location.href = checkout_url;
    } catch {
      setError('Failed to start checkout. Please try again.');
      setStripeLoading(false);
    }
  }

  async function handlePromoRedeem(e) {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    setPromoSuccess(null);
    try {
      await subscriptionsApi.redeemPromoCode(promoCode.trim());
      await refreshUser();
      setPromoSuccess('Promo code redeemed! Redirecting...');
      setPromoCode('');
      setTimeout(() => navigate('/subscription-confirmation', {
        state: {
          plan: 'Pro Care Plan',
          price: 'Free',
          billingCycle: 'promo',
          isPromo: true,
        },
      }), 1500);
    } catch (err) {
      setPromoError(
        err.response?.data?.error || 'Failed to redeem promo code. Please try again.'
      );
    } finally {
      setPromoLoading(false);
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
        <button className="btn btn-outline btn-pill back-btn" onClick={() => navigate(-1)}>
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
              <li className="pricing-feature pricing-feature--disabled">{X_ICON} No exports (PDF, calendar, or email)</li>
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
              ) : (
                <>
                  {/* Payment Method Toggle */}
                  <div className="pricing-payment-toggle">
                    <button
                      className={`pricing-payment-toggle__btn${paymentMethod === 'stripe' ? ' pricing-payment-toggle__btn--active' : ''}`}
                      onClick={() => setPaymentMethod('stripe')}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                      Card
                    </button>
                    <button
                      className={`pricing-payment-toggle__btn${paymentMethod === 'paypal' ? ' pricing-payment-toggle__btn--active' : ''}`}
                      onClick={() => setPaymentMethod('paypal')}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.603c-.564 0-1.04.405-1.128.958L7.076 21.337z" />
                      </svg>
                      PayPal
                    </button>
                  </div>

                  {/* Stripe Payment */}
                  {paymentMethod === 'stripe' && (
                    stripeLoading || processingPlan === 'pro' ? (
                      <LoadingSpinner />
                    ) : (
                      <button
                        className="btn btn-primary btn-block"
                        onClick={handleStripeCheckout}
                      >
                        Subscribe with Card
                      </button>
                    )
                  )}

                  {/* PayPal Payment */}
                  {paymentMethod === 'paypal' && (
                    processingPlan === 'pro' || isPayPalPending ? (
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
                    )
                  )}
                </>
              )}
              <p className="pricing-billing-note">
                Your bank statement will show <strong>PETVAXCALENDAR.COM</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Promo Code Section */}
        {isAuthenticated && !isPaid && (
          <div className="pricing-promo">
            {!promoOpen ? (
              <button
                className="pricing-promo__toggle"
                onClick={() => setPromoOpen(true)}
              >
                Have a promo code?
              </button>
            ) : (
              <div className="pricing-promo__form-wrapper">
                <h3 className="pricing-promo__title">Redeem Promo Code</h3>
                {promoSuccess && (
                  <div className="pricing-promo__success">{promoSuccess}</div>
                )}
                {promoError && (
                  <div className="pricing-promo__error">{promoError}</div>
                )}
                <form className="pricing-promo__form" onSubmit={handlePromoRedeem}>
                  <input
                    type="text"
                    className="pricing-promo__input"
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    disabled={promoLoading}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="btn btn-primary pricing-promo__btn"
                    disabled={promoLoading || !promoCode.trim()}
                  >
                    {promoLoading ? 'Redeeming...' : 'Redeem'}
                  </button>
                </form>
                <button
                  className="pricing-promo__cancel"
                  onClick={() => {
                    setPromoOpen(false);
                    setPromoError(null);
                    setPromoSuccess(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

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
                  <td>{X_ICON}</td>
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
                can view it on screen anytime. Exports (PDF, calendar, email) are
                available with the Pro Care plan.
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
