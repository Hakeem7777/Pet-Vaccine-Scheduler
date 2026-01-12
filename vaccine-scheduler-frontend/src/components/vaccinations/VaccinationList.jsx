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
        <h3>Vaccination History</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          Add Vaccination
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {vaccinations.length === 0 ? (
        <p className="no-vaccinations">No vaccination records yet.</p>
      ) : (
        <table className="vaccination-table">
          <thead>
            <tr>
              <th>Vaccine</th>
              <th>Date</th>
              <th>Dose</th>
              <th>Administered By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vaccinations.map((vax) => (
              <tr key={vax.id}>
                <td>
                  <strong>{vax.vaccine_name}</strong>
                  {vax.notes && <p className="vax-notes">{vax.notes}</p>}
                </td>
                <td>{formatDate(vax.date_administered)}</td>
                <td>{vax.dose_number || '-'}</td>
                <td>{vax.administered_by || '-'}</td>
                <td>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(vax.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
