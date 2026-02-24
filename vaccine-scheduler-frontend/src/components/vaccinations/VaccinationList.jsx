import { useState, useEffect } from 'react';
import { getVaccinations, addVaccination, deleteVaccination } from '../../api/vaccinations';
import VaccinationForm from './VaccinationForm';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatDate } from '../../utils/dateUtils';

function VaccinationList({ dogId, onUpdate, refreshKey }) {
  const [vaccinations, setVaccinations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchVaccinations();
  }, [dogId, refreshKey]);

  async function fetchVaccinations() {
    try {
      const data = await getVaccinations(dogId);
      const records = Array.isArray(data) ? data : data.results || [];
      // Sort by date descending (most recent first)
      records.sort((a, b) => new Date(b.date_administered) - new Date(a.date_administered));
      setVaccinations(records);
      setError(null);
    } catch (err) {
      setError('Failed to load vaccination history.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAdd(formData) {
    setIsSubmitting(true);
    try {
      await addVaccination(dogId, formData);
      setShowAddModal(false);
      fetchVaccinations();
      onUpdate?.();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(vaccinationId) {
    if (!window.confirm('Are you sure you want to delete this vaccination record?')) {
      return;
    }

    try {
      await deleteVaccination(dogId, vaccinationId);
      fetchVaccinations();
      onUpdate?.();
    } catch (err) {
      setError('Failed to delete vaccination.');
    }
  }

  if (isLoading) {
    return <LoadingSpinner size="small" />;
  }

  return (
    <div className="vaccination-list">
      <div className="vaccination-list-header">
        <h3>History</h3>
        <button className="btn btn-outline btn-sm" onClick={() => setShowAddModal(true)}>
          Add History +
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {vaccinations.length === 0 ? (
        <p className="no-vaccinations">No vaccination records yet.</p>
      ) : (
        <div className="vaccination-cards">
          {vaccinations.map((vax) => (
            <div key={vax.id} className="vaccination-card">
              <div className="vaccination-card__content">
                <p className="vaccination-card__name">{vax.vaccine_name}</p>
                <div className="vaccination-card__meta">
                  <span>Date: {formatDate(vax.date_administered)}</span>
                  <span>Dose: {vax.dose_number || '-'}</span>
                </div>
              </div>
              <button
                className="vaccination-card__delete"
                onClick={() => handleDelete(vax.id)}
                aria-label="Delete vaccination"
              >
                <img src="/Images/generic_icons/Delete-icon.svg" alt="Delete" width="20" height="20" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Vaccination Record"
      >
        <VaccinationForm
          onSubmit={handleAdd}
          onCancel={() => setShowAddModal(false)}
          isLoading={isSubmitting}
        />
      </Modal>
    </div>
  );
}

export default VaccinationList;
