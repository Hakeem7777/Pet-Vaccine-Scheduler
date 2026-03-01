import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './UpgradePrompt.css';

function UpgradePrompt({ feature, currentLimit, onClose }) {
  const navigate = useNavigate();
  const { isAuthenticated, hasActiveSubscription } = useAuth();

  const messages = {
    dogs: {
      title: 'Dog Limit Reached',
      description: 'Subscribe to Pro Care to add unlimited dogs and unlock all features.',
    },
    ai: {
      title: 'AI Chatbot',
      description: 'Subscribe to Pro Care to access the AI-powered vaccine assistant.',
    },
    default: {
      title: 'Upgrade Required',
      description: 'Subscribe to Pro Care to unlock this feature.',
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
            View Plans
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
