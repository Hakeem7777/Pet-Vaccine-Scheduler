import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom';
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
import { SEX_CHOICES } from '../utils/constants';
import { MEDICAL_CONDITIONS, MEDICATION_CATALOG } from '../utils/medicalConstants';
import { getDogImageUrl } from '../utils/breedImageUtils';
import { formatDogAge } from '../utils/dateUtils';

function DogDetailPage() {
  const { dogId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();
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
      navigate('/home');
    } else {
      try {
        await deleteDog(dogId);
        navigate('/home');
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

  if (isAdmin) {
    return <Navigate to="/admin-panel" replace />;
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
        <button className="btn btn-outline" onClick={() => navigate('/home')}>
          &larr; Back to Dashboard
        </button>
        <div className="error-message">{error || 'Dog not found'}</div>
      </PageTransition>
    );
  }

  const sexLabel = SEX_CHOICES.find((s) => s.value === dog.sex)?.label || dog.sex_display;

  return (
    <PageTransition className="dog-detail-page">
      {/* Breadcrumb */}
      <div className="dog-detail-breadcrumb">
        <Link to="/home" className="breadcrumb-link">My Dogs</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{dog.name}</span>
      </div>

      {/* Top bar: Back + Actions */}
      <div className="dog-detail-topbar">
        <button className="btn btn-outline btn-pill back-btn" onClick={() => navigate('/home')}>
          &larr; Back
        </button>
        <div className="dog-detail-topbar-actions">
          <button className="btn btn-outline btn-pill" onClick={() => setShowEditModal(true)}>
            Edit <img src="/Images/generic_icons/Edit-Icon.svg" alt="" width="16" height="16" style={{marginLeft:"5px"}} />
          </button>
          {!isGuestDog && (
            <button className="btn btn-outline btn-pill" onClick={() => setShowUploadModal(true)}>
              Upload Document <img src="/Images/generic_icons/export-icon.svg" alt="" width="16" height="16" style={{marginLeft:"5px"}} />
            </button>
          )}
          <button className="btn btn-outline-danger btn-pill" onClick={handleDelete}>
            Delete <img src="/Images/generic_icons/Delete-icon.svg" alt="" width="16" height="16" style={{marginLeft:"5px"}}/>
          </button>
        </div>
      </div>

      {isGuestDog && (
        <div className="guest-banner guest-banner--info">
          <p>
            <strong>Guest Mode:</strong> Your schedule is saved locally. Sign up to save your data permanently and access all features.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/signup')}>
            Sign Up Free
          </button>
        </div>
      )}

      {/* Two-column: Dog Info + Vaccination Progress */}
      <div className="dog-detail-hero" data-tour="dog-info-card">
        <div className="dog-info-card">
          <div className="dog-info-card-inner">
            <div className="dog-info-photo">
              <img
                src={getDogImageUrl(dog)}
                alt={dog.name}
                onError={(e) => { e.target.src = '/Images/dog_icon.svg'; }}
              />
            </div>
            <div className="dog-info-body">
              <div className="dog-info-row dog-info-row--3">
                <div className="info-item">
                  <label>Name</label>
                  <span>{dog.name}</span>
                </div>
                <div className="info-item">
                  <label>Weight</label>
                  <span>{dog.weight_kg ? `${dog.weight_kg}kg` : '\u2014'}</span>
                </div>
                <div className="info-item">
                  <label>Breed</label>
                  <span className="info-item-breed" title={dog.breed || ''}>{dog.breed || '\u2014'}</span>
                </div>
              </div>
              <div className="dog-info-row dog-info-row--2">
                <div className="info-item">
                  <label>Age</label>
                  <span>{formatDogAge(dog.birth_date)}</span>
                </div>
                <div className="info-item">
                  <label>Sex</label>
                  <span>{sexLabel || '\u2014'}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Vaccination Progress Card */}
        <div className="vaccination-progress-card">
          <div className="vaccination-progress-header">
            <h3>Vaccination Progress</h3>
            <span className="vaccination-progress-percent">
              {dog.vaccination_summary?.progress_percent ?? 0} %
            </span>
          </div>
          <div className="vaccination-progress-details">
            {dog.vaccination_summary?.next_upcoming && (
              <p className="vaccination-progress-upcoming">
                Upcoming Vaccine: {dog.vaccination_summary.next_upcoming.vaccine}
              </p>
            )}
            <p className="vaccination-progress-count">
              {dog.vaccination_summary?.overdue?.length > 0
                ? `${dog.vaccination_summary.overdue.length} vaccine(s) overdue`
                : 'All vaccines on track'}
            </p>
          </div>
          <div className="vaccination-progress-bar-wrapper">
            <div className="vaccination-progress-bar">
              <div
                className="vaccination-progress-fill"
                style={{ width: `${dog.vaccination_summary?.progress_percent ?? 0}%` }}
              />
            </div>
            <span className="vaccination-progress-bar-label">
              {dog.vaccination_summary?.progress_percent ?? 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Environment & Health Card */}
      {(dog.env_indoor_only || dog.env_dog_parks || dog.env_daycare_boarding || dog.env_travel_shows || dog.env_tick_exposure ||
        dog.health_vaccine_reaction === 'yes' || dog.health_immune_condition === 'yes' || dog.health_immunosuppressive_meds === 'yes' ||
        dog.health_pregnant_breeding === 'yes' || dog.health_prescription_meds === 'yes' || dog.health_chronic_condition === 'yes' ||
        dog.medical_conditions?.length > 0 ||
        (dog.medications && Object.keys(dog.medications).some((k) => dog.medications[k]?.length > 0))) && (
        <div className="dog-health-card">
          {(dog.env_indoor_only || dog.env_dog_parks || dog.env_daycare_boarding || dog.env_travel_shows || dog.env_tick_exposure) && (
            <div className="dog-environment">
              <label>Environment</label>
              <div className="env-tags">
                {dog.env_indoor_only && <span className="env-tag">Indoor</span>}
                {dog.env_dog_parks && <span className="env-tag">Dog parks</span>}
                {dog.env_daycare_boarding && <span className="env-tag">Daycare/Boarding</span>}
                {dog.env_travel_shows && <span className="env-tag">Travel/Shows</span>}
                {dog.env_tick_exposure && <span className="env-tag">Tick exposure</span>}
              </div>
            </div>
          )}

          {(dog.health_vaccine_reaction === 'yes' ||
            dog.health_immune_condition === 'yes' ||
            dog.health_immunosuppressive_meds === 'yes' ||
            dog.health_pregnant_breeding === 'yes' ||
            dog.health_prescription_meds === 'yes' ||
            dog.health_chronic_condition === 'yes') && (
            <div className="dog-environment">
              <label>Health Flags</label>
              <div className="env-tags">
                {dog.health_vaccine_reaction === 'yes' && (
                  <span className="env-tag env-tag--warning">Prior vaccine reaction</span>
                )}
                {dog.health_immune_condition === 'yes' && (
                  <span className="env-tag env-tag--danger">Immune condition</span>
                )}
                {dog.health_immunosuppressive_meds === 'yes' && (
                  <span className="env-tag env-tag--danger">Immunosuppressive meds</span>
                )}
                {dog.health_pregnant_breeding === 'yes' && (
                  <span className="env-tag env-tag--danger">Pregnant/breeding</span>
                )}
                {dog.health_prescription_meds === 'yes' && (
                  <span className="env-tag env-tag--warning">Prescription meds</span>
                )}
                {dog.health_chronic_condition === 'yes' && (
                  <span className="env-tag env-tag--warning">Chronic condition</span>
                )}
              </div>
            </div>
          )}

          {dog.medical_conditions?.length > 0 && (
            <div className="dog-environment">
              <label>Medical Conditions</label>
              <div className="env-tags">
                {dog.medical_conditions.map((condId) => {
                  const cond = MEDICAL_CONDITIONS.find((c) => c.id === condId);
                  return (
                    <span key={condId} className="env-tag env-tag--danger">
                      {cond ? `${cond.icon} ${cond.label}` : condId}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {dog.medications && Object.keys(dog.medications).some((k) => dog.medications[k]?.length > 0) && (
            <div className="dog-environment">
              <label>Current Medications</label>
              <div className="env-tags">
                {Object.entries(dog.medications).flatMap(([catKey, meds]) =>
                  (meds || []).map((medId) => {
                    const catData = MEDICATION_CATALOG[catKey];
                    const medData = catData?.options.find((o) => o.id === medId);
                    const isIsox = medData?.drugClass === 'isoxazoline' &&
                      dog.medical_conditions?.includes('epilepsy');
                    return (
                      <span
                        key={`${catKey}-${medId}`}
                        className={`env-tag ${isIsox ? 'env-tag--danger' : 'env-tag--warning'}`}
                      >
                        {medData?.label || medId}
                        {isIsox && ' (FDA Warning)'}
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="dog-detail-content">
        <div className="schedule-section" data-tour="schedule-section">
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
