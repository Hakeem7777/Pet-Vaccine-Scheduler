import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDog, updateDog, deleteDog } from '../api/dogs';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import useGuestStore from '../store/useGuestStore';
import DogForm from '../components/dogs/DogForm';
import DocumentUploadModal from '../components/dogs/DocumentUploadModal';
import ScheduleView from '../components/schedule/ScheduleView';
import GuestScheduleView from '../components/schedule/GuestScheduleView';
import VaccinationList from '../components/vaccinations/VaccinationList';
import GuestVaccinationList from '../components/vaccinations/GuestVaccinationList';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageTransition from '../components/common/PageTransition';
import { formatDate } from '../utils/dateUtils';
import { AGE_CLASSIFICATIONS, SEX_CHOICES } from '../utils/constants';

function DogDetailPage() {
  const { dogId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { setDogContext } = useChat();
  const { guestDog, updateGuestDog, deleteGuestDog } = useGuestStore();

  const isGuestDog = dogId === 'guest-dog';

  const [dog, setDog] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentSelectedNoncore, setCurrentSelectedNoncore] = useState([]);

  useEffect(() => {
    if (isGuestDog) {
      // Load guest dog from store
      if (guestDog) {
        setDog(guestDog);
        setError(null);
      } else {
        setError('Dog not found');
      }
      setIsLoading(false);
    } else if (isAuthenticated) {
      // Load dog from API
      fetchDog();
    } else {
      // Not authenticated and not a guest dog
      setError('Please log in to view this dog.');
      setIsLoading(false);
    }
  }, [dogId, isGuestDog, guestDog, isAuthenticated]);

  // Set dog context for chat when dog data is loaded (only for authenticated users)
  useEffect(() => {
    if (dog && isAuthenticated && !isGuestDog) {
      setDogContext(parseInt(dogId, 10), dog, currentSelectedNoncore);
    }
    return () => {
      if (isAuthenticated) {
        setDogContext(null, null, []);
      }
    };
  }, [dog, dogId, setDogContext, isAuthenticated, isGuestDog, currentSelectedNoncore]);

  async function fetchDog() {
    try {
      const data = await getDog(dogId);
      setDog(data);
      setError(null);
    } catch (err) {
      setError('Failed to load dog details.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdate(formData) {
    setIsSubmitting(true);

    if (isGuestDog) {
      // Update guest dog locally
      const updated = updateGuestDog(formData);
      setDog(updated);
      setShowEditModal(false);
      setIsSubmitting(false);
      setRefreshKey((prev) => prev + 1);
    } else {
      // Update via API
      try {
        const updated = await updateDog(dogId, formData);
        setDog(updated);
        setShowEditModal(false);
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete ${dog.name}? This action cannot be undone.`)) {
      return;
    }

    if (isGuestDog) {
      deleteGuestDog();
      navigate('/');
    } else {
      try {
        await deleteDog(dogId);
        navigate('/');
      } catch (err) {
        setError('Failed to delete dog.');
      }
    }
  }

  function handleVaccinationUpdate() {
    if (!isGuestDog) {
      fetchDog();
    }
    setRefreshKey((prev) => prev + 1);
  }

  if (isLoading) {
    return (
      <div className="page-loading">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !dog) {
    return (
      <PageTransition className="dog-detail-page">
        <button className="btn btn-outline" onClick={() => navigate('/')}>
          &larr; Back to Dashboard
        </button>
        <div className="error-message">{error || 'Dog not found'}</div>
      </PageTransition>
    );
  }

  const sexLabel = SEX_CHOICES.find((s) => s.value === dog.sex)?.label || dog.sex_display;

  return (
    <PageTransition className="dog-detail-page">
      <button className="btn btn-outline back-btn" onClick={() => navigate('/')}>
        &larr; Back to Dashboard
      </button>

      {isGuestDog && (
        <div className="guest-banner guest-banner--info">
          <p>
            <strong>Guest Mode:</strong> Your schedule is saved locally. Sign up to save your data permanently and access all features.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>
            Sign Up Free
          </button>
        </div>
      )}

      <div className="dog-info-card">
        <div className="dog-info-header">
          <div className="dog-info-title">
            <h2>{dog.name}</h2>
            <span className={`age-badge age-${dog.age_classification}`}>
              {AGE_CLASSIFICATIONS[dog.age_classification] || dog.age_classification}
            </span>
          </div>
          <div className="dog-info-actions">
            {!isGuestDog && (
              <button className="btn btn-secondary" onClick={() => setShowUploadModal(true)}>
                Upload Document
              </button>
            )}
            <button className="btn btn-outline" onClick={() => setShowEditModal(true)}>
              Edit
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>

        <div className="dog-info-body">
          <div className="dog-info-grid">
            {dog.breed && (
              <div className="info-item">
                <label>Breed</label>
                <span>{dog.breed}</span>
              </div>
            )}
            <div className="info-item">
              <label>Age</label>
              <span>{dog.age_weeks} weeks</span>
            </div>
            {sexLabel && (
              <div className="info-item">
                <label>Sex</label>
                <span>{sexLabel}</span>
              </div>
            )}
            <div className="info-item">
              <label>Birth Date</label>
              <span>{formatDate(dog.birth_date)}</span>
            </div>
            {dog.weight_kg && (
              <div className="info-item">
                <label>Weight</label>
                <span>{dog.weight_kg} kg</span>
              </div>
            )}
          </div>

          {(dog.env_indoor_only || dog.env_dog_parks || dog.env_daycare_boarding || dog.env_travel_shows || dog.env_tick_exposure) && (
            <div className="dog-environment">
              <label>Environment</label>
              <div className="env-tags">
                {dog.env_indoor_only && <span className="env-tag">Indoor only</span>}
                {dog.env_dog_parks && <span className="env-tag">Dog parks</span>}
                {dog.env_daycare_boarding && <span className="env-tag">Daycare/Boarding</span>}
                {dog.env_travel_shows && <span className="env-tag">Travel/Shows</span>}
                {dog.env_tick_exposure && <span className="env-tag">Tick exposure</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="dog-detail-content">
        <div className="schedule-section">
          {isGuestDog ? (
            <GuestScheduleView
              key={refreshKey}
              dog={dog}
              onVaccinationAdded={handleVaccinationUpdate}
            />
          ) : (
            <ScheduleView
              key={refreshKey}
              dogId={dogId}
              dogName={dog.name}
              dog={dog}
              onVaccinationAdded={handleVaccinationUpdate}
              onScheduleLoad={setCurrentSelectedNoncore}
            />
          )}
        </div>

        <div className="history-section">
          {isGuestDog ? (
            <GuestVaccinationList
              onUpdate={handleVaccinationUpdate}
              refreshKey={refreshKey}
            />
          ) : (
            <VaccinationList
              dogId={dogId}
              onUpdate={handleVaccinationUpdate}
              refreshKey={refreshKey}
            />
          )}
        </div>
      </div>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit ${dog.name}`}
        hideHeader
      >
        <DogForm
          dog={dog}
          onSubmit={handleUpdate}
          onCancel={() => setShowEditModal(false)}
          isLoading={isSubmitting}
        />
      </Modal>

      {!isGuestDog && (
        <Modal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          title="Upload Document"
        >
          <DocumentUploadModal
            dogId={parseInt(dogId, 10)}
            dog={dog}
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => {
              fetchDog();
              setRefreshKey((prev) => prev + 1);
              setShowUploadModal(false);
            }}
          />
        </Modal>
      )}
    </PageTransition>
  );
}

export default DogDetailPage;
