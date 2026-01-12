import { useState, useMemo } from 'react';
import useGuestStore from '../../store/useGuestStore';
import GuestVaccinationForm from './GuestVaccinationForm';
import Modal from '../common/Modal';
import { formatDate } from '../../utils/dateUtils';

function GuestVaccinationList({ onUpdate, refreshKey }) {
  const { vaccinations, addVaccination, deleteVaccination } = useGuestStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sort vaccinations by date descending
  const sortedVaccinations = useMemo(() => {
    return [...vaccinations].sort(
      (a, b) => new Date(b.date_administered) - new Date(a.date_administered)
    );
  }, [vaccinations, refreshKey]);

  function handleAdd(formData) {
    setIsSubmitting(true);
    addVaccination(formData);
    setShowAddModal(false);
    setIsSubmitting(false);
    onUpdate?.();
  }

  function handleDelete(vaccinationId) {
    if (!window.confirm('Are you sure you want to delete this vaccination record?')) {
      return;
    }
    deleteVaccination(vaccinationId);
    onUpdate?.();
  }

  return (
    <div className="vaccination-list">
      <div className="vaccination-list-header">
        <h3>Vaccination History</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          Add Vaccination
        </button>
      </div>

      {sortedVaccinations.length === 0 ? (
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
            {sortedVaccinations.map((vax) => (
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
        <GuestVaccinationForm
          onSubmit={handleAdd}
          onCancel={() => setShowAddModal(false)}
          isLoading={isSubmitting}
        />
      </Modal>
    </div>
  );
}

export default GuestVaccinationList;
