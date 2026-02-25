import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './UpgradePrompt.css';

function UpgradePrompt({ feature, currentLimit, onClose }) {
  const navigate = useNavigate();
  const { isAuthenticated, hasActiveSubscription, subscriptionPlan } = useAuth();

  const messages = {
    dogs: {
      title: 'Dog Limit Reached',
      description: hasActiveSubscription
        ? `Your ${subscriptionPlan === 'basic' ? 'Basic' : ''} plan allows up to ${currentLimit} dogs. Upgrade to Premium for unlimited dogs.`
        : 'Create a free account and subscribe to add more dogs.',
    },
    ai: {
      title: 'AI Chatbot',
      description: hasActiveSubscription
        ? 'You\'ve reached your daily AI message limit. Upgrade for more messages.'
        : 'Subscribe to access the AI-powered vaccine assistant.',
    },
    default: {
      title: 'Upgrade Required',
      description: 'This feature requires an active subscription.',
    },
  };

  const msg = messages[feature] || messages.default;

  return (
    <div className="upgrade-prompt">
      <div className="upgrade-prompt-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
      <h3>{msg.title}</h3>
      <p>{msg.description}</p>
      <div className="upgrade-prompt-actions">
        {onClose && (
          <button className="btn btn-outline" onClick={onClose}>
            Maybe Later
          </button>
        )}
        {isAuthenticated ? (
          <button className="btn btn-primary" onClick={() => navigate('/pricing')}>
            {hasActiveSubscription ? 'Upgrade Plan' : 'View Plans'}
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => navigate('/signup')}>
            Sign Up
          </button>
        )}
      </div>
    </div>
  );
}

export default UpgradePrompt;
