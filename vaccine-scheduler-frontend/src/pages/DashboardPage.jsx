import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import useDogStore from '../store/useDogStore';
import useGuestStore from '../store/useGuestStore';
import useTourStore from '../store/useTourStore';
import DogList from '../components/dogs/DogList';
import DogForm from '../components/dogs/DogForm';
import DocumentUploadModal from '../components/dogs/DocumentUploadModal';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageTransition from '../components/common/PageTransition';
import UpgradePrompt from '../components/subscription/UpgradePrompt';
import { trackEventOnce } from '../utils/analytics';

function DashboardPage() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    isAdmin,
    isLoading: isAuthLoading,
    enterGuestMode,
    hasActiveSubscription,
    dogLimit,
  } = useAuth();

  const { setAllDogsContext } = useChat();
  const {
    dogs,
    isLoading,
    error,
    fetchDogs,
    addDog,
    clearError,
  } = useDogStore();

  const { guestDog, addGuestDog } = useGuestStore();

  const {
    isRunning,
    pauseTour,
    resumeTour,
    pausedAtStep,
  } = useTourStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch dogs only if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchDogs();
    }
  }, [isAuthenticated, fetchDogs]);

  // Set all-dogs context for chat when on dashboard
  useEffect(() => {
    if (isAuthenticated && dogs && dogs.length > 0) {
      const confirmedDogs = dogs.filter(
        (dog) => !dog._isOptimistic
      );

      if (confirmedDogs.length > 0) {
        setAllDogsContext(confirmedDogs);
      }
    }

    return () => {
      if (isAuthenticated) {
        setAllDogsContext(null);
      }
    };
  }, [isAuthenticated, dogs, setAllDogsContext]);

  const displayDogs = isAuthenticated
    ? dogs
    : guestDog
      ? [guestDog]
      : [];

  const showLoading =
    isAuthenticated && isLoading;

  const confirmedDogCount = dogs.filter(
    (dog) => !dog._isOptimistic
  ).length;

  async function handleAddDog(formData) {
    setIsSubmitting(true);

    if (isAuthenticated) {
      const isFirstRegisteredDog =
        confirmedDogCount === 0;

      try {
        await addDog(formData);

        // Track the first free schedule created by a registered free user.
        if (
          !hasActiveSubscription &&
          isFirstRegisteredDog
        ) {
          trackEventOnce(
            'free_schedule_created',
            'registered_first_schedule',
            {
              account_type: 'registered',
              creation_method: 'manual',
              schedule_type: 'personalized',
            }
          );
        }

        setShowAddModal(false);

        if (pausedAtStep !== null) {
          resumeTour();
        }
      } catch (err) {
        // Error is handled by the store.
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (guestDog) {
        setShowSignupPrompt(true);
        setIsSubmitting(false);
        return;
      }

      const newDog = addGuestDog(formData);

      trackEventOnce(
        'free_schedule_created',
        'guest_first_schedule',
        {
          account_type: 'guest',
          creation_method: 'manual',
          schedule_type: 'personalized',
        }
      );

      setIsSubmitting(false);
      setShowAddModal(false);

      enterGuestMode();
      navigate(`/dogs/${newDog.id}`);
    }
  }

  function handleUploadSuccess(newDog) {
    if (isAuthenticated) {
      if (
        !hasActiveSubscription &&
        confirmedDogCount === 0
      ) {
        trackEventOnce(
          'free_schedule_created',
          'registered_first_schedule',
          {
            account_type: 'registered',
            creation_method: 'document_upload',
            schedule_type: 'personalized',
          }
        );
      }

      fetchDogs();
    }
  }

  function handleAddDogClick() {
    if (!isAuthenticated && guestDog) {
      setShowSignupPrompt(true);
      return;
    }

    if (
      isAuthenticated &&
      dogLimit !== null &&
      dogs.length >= dogLimit
    ) {
      setShowUpgradePrompt(true);
      return;
    }

    if (isRunning) {
      pauseTour();
    }

    setShowAddModal(true);
  }

  function handleAddModalClose() {
    setShowAddModal(false);

    if (pausedAtStep !== null) {
      resumeTour();
    }
  }

  function handleUploadClick() {
    if (!isAuthenticated && guestDog) {
      setShowSignupPrompt(true);
      return;
    }

    if (!isAuthenticated) {
      setShowSignupPrompt(true);
      return;
    }

    setShowUploadModal(true);
  }

  if (isAuthLoading) {
    return (
      <div className="page-loading">
        <LoadingSpinner />
      </div>
    );
  }

  if (isAdmin) {
    return <Navigate to="/admin-panel" replace />;
  }

  if (showLoading) {
    return (
      <div className="page-loading">
        <LoadingSpinner />
      </div>
    );
  }

  if (displayDogs.length === 0) {
    return (
      <PageTransition
        className="dashboard-page"
        data-tour="welcome"
      >
        <div className="page-header">
          <p>Welcome to Petvax Calendar!</p>

          {isAuthenticated && (
            <div className="page-header-actions">
              <button
                className="btn btn-secondary"
                onClick={handleUploadClick}
                data-tour="upload-doc-btn"
              >
                Upload Document
              </button>
            </div>
          )}
        </div>

        {!isAuthenticated && (
          <div className="guest-banner">
            <p>
              Try it free! Create your first dog's vaccine
              schedule - no account needed.
            </p>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}

            <button
              className="btn btn-sm btn-outline"
              onClick={clearError}
              style={{ marginLeft: '1rem' }}
            >
              Dismiss
            </button>
          </div>
        )}

        <div
          className="first-dog-form-container"
          data-tour="first-dog-form"
        >
          <DogForm
            onSubmit={handleAddDog}
            isLoading={isSubmitting}
          />
        </div>

        {isAuthenticated && (
          <Modal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            title="Add Dog from Document"
          >
            <DocumentUploadModal
              mode="create"
              onClose={() => setShowUploadModal(false)}
              onSuccess={handleUploadSuccess}
            />
          </Modal>
        )}
      </PageTransition>
    );
  }

  return (
    <PageTransition
      className="dashboard-page"
      data-tour="welcome"
    >
      <div className="page-header">
        <h2>
          {isAuthenticated ? 'My Pets' : 'Your Pet'}
        </h2>

        <div className="page-header-actions">
          {isAuthenticated && (
            <button
              className="btn btn-outline btn-pill"
              onClick={handleUploadClick}
              data-tour="upload-doc-btn"
            >
              Quick Add
            </button>
          )}

          <button
            className="btn btn-primary btn-pill"
            onClick={handleAddDogClick}
            data-tour="add-dog-btn"
          >
            Add New Pet
          </button>
        </div>
      </div>

      {!isAuthenticated && guestDog && (
        <div className="guest-banner guest-banner--info">
          <p>
            <strong>You're in guest mode.</strong>{' '}
            Sign up to save your data, add more dogs,
            send email reminders and much more.
          </p>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/signup')}
          >
            Sign Up Free
          </button>
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}

          <button
            className="btn btn-sm btn-outline"
            onClick={clearError}
            style={{ marginLeft: '1rem' }}
          >
            Dismiss
          </button>
        </div>
      )}

      <div data-tour="dog-list">
        <DogList
          dogs={displayDogs}
          isGuestMode={!isAuthenticated}
        />
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={handleAddModalClose}
        title="Add New Dog"
        hideHeader
      >
        <DogForm
          onSubmit={handleAddDog}
          onCancel={handleAddModalClose}
          isLoading={isSubmitting}
        />
      </Modal>

      {isAuthenticated && (
        <Modal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          title="Add Dog from Document"
        >
          <DocumentUploadModal
            mode="create"
            onClose={() => setShowUploadModal(false)}
            onSuccess={handleUploadSuccess}
          />
        </Modal>
      )}

      {/* Signup Prompt Modal (for guests) */}
      <Modal
        isOpen={showSignupPrompt}
        onClose={() => setShowSignupPrompt(false)}
        title="Sign Up to Continue"
      >
        <div className="signup-prompt">
          <div className="signup-prompt-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>

          <h3>You've used your free trial!</h3>

          <p>
            Create a free account to add more dogs, access
            vaccination history, get AI-powered recommendations,
            and save your data securely.
          </p>

          <div className="signup-prompt-actions">
            <button
              className="btn btn-outline"
              onClick={() => setShowSignupPrompt(false)}
            >
              Maybe Later
            </button>

            <button
              className="btn btn-primary"
              onClick={() => navigate('/signup')}
            >
              Sign Up Free
            </button>
          </div>

          <p className="signup-prompt-login">
            Already have an account?{' '}

            <button
              className="btn-link"
              onClick={() => navigate('/login')}
            >
              Log in
            </button>
          </p>
        </div>
      </Modal>

      {/* Upgrade Prompt Modal */}
      <Modal
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        title="Upgrade Required"
      >
        <UpgradePrompt
          feature="dogs"
          currentLimit={dogLimit}
          onClose={() => setShowUpgradePrompt(false)}
        />
      </Modal>
    </PageTransition>
  );
}

export default DashboardPage;
