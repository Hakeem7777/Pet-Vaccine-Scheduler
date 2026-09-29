import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { trackEvent } from '../../utils/analytics';
import './UpgradePrompt.css';

function UpgradePrompt({ feature, currentLimit, onClose, source }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const messages = {
    dogs: {
      title: 'Dog Limit Reached',
      description:
        'Subscribe to Pro Care to add unlimited dogs and unlock all features.',
      cta: 'View Pro Care',
      pricingFeature: 'multipet',
      defaultSource: 'dog_limit',
    },
    ai: {
      title: 'AI Chatbot',
      description:
        'Subscribe to Pro Care to access the AI-powered vaccine assistant.',
      cta: 'Unlock AI Assistant',
      pricingFeature: 'ai',
      defaultSource: 'ai_feature',
    },
    documents: {
      title: 'Document Storage',
      description:
        'Subscribe to Pro Care to upload, store, view, and download important documents for your dogs.',
      cta: 'Unlock Document Storage',
      pricingFeature: 'documents',
      defaultSource: 'document_storage',
    },
    default: {
      title: 'Upgrade Required',
      description:
        'Subscribe to Pro Care to unlock this feature.',
      cta: 'View Plans',
      pricingFeature: 'general',
      defaultSource: 'upgrade_prompt',
    },
  };

  const msg = messages[feature] || messages.default;

  function handleUpgradeClick() {
    const upgradeSource =
      source || msg.defaultSource;

    trackEvent('pro_upgrade_click', {
      feature: msg.pricingFeature,
      source: upgradeSource,
      current_limit: currentLimit ?? undefined,
    });

    if (isAuthenticated) {
      navigate(
        `/pricing?feature=${encodeURIComponent(
          msg.pricingFeature
        )}&source=${encodeURIComponent(
          upgradeSource
        )}`
      );
      return;
    }

    navigate('/signup');
  }

  return (
    <div className="upgrade-prompt">
      <div className="upgrade-prompt-icon">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>

      <h3>{msg.title}</h3>
      <p>{msg.description}</p>

      <div className="upgrade-prompt-actions">
        {onClose && (
          <button
            className="btn btn-outline"
            onClick={onClose}
          >
            Maybe Later
          </button>
        )}

        <button
          className="btn btn-primary"
          onClick={handleUpgradeClick}
        >
          {isAuthenticated
            ? msg.cta
            : 'Sign Up'}
        </button>
      </div>
    </div>
  );
}

export default UpgradePrompt;
