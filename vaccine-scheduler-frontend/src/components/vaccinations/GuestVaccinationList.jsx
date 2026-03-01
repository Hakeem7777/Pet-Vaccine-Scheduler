import { useState, useMemo } from 'react';
import useGuestStore from '../../store/useGuestStore';
import GuestVaccinationForm from './GuestVaccinationForm';
import Modal from '../common/Modal';
import { formatDate } from '../../utils/dateUtils';
import './VaccinationForm.css';

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
        <h3>History</h3>
        <button className="btn btn-outline btn-sm" onClick={() => setShowAddModal(true)}>
          Add History +
        </button>
      </div>

      {sortedVaccinations.length === 0 ? (
        <p className="no-vaccinations">No vaccination records yet.</p>
      ) : (
        <div className="vaccination-cards">
          {sortedVaccinations.map((vax) => (
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
        title={
          <span className="vax-modal-title">
            <span className="vax-modal-title-icon">
              <img src="/Images/generic_icons/syringe_icon.svg" alt="" width="20" height="20" />
            </span>
            Add Vaccination Record
          </span>
        }
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
