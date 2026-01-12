import { useState } from 'react';
import { getToday } from '../../utils/dateUtils';
import { VACCINE_RULES } from '../../utils/guestScheduler';

function GuestVaccinationForm({ onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    vaccine_id: '',
    date_administered: getToday(),
    dose_number: '',
    notes: '',
    administered_by: '',
  });
  const [errors, setErrors] = useState({});

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setErrors({});

    if (!formData.vaccine_id) {
      setErrors({ vaccine_id: 'Please select a vaccine' });
      return;
    }

    // Find vaccine name
    const vaccine = VACCINE_RULES.find((v) => v.id === formData.vaccine_id);

    const submitData = {
      vaccine_id: formData.vaccine_id,
      vaccine_name: vaccine?.name || formData.vaccine_id,
      date_administered: formData.date_administered,
      dose_number: formData.dose_number ? parseInt(formData.dose_number, 10) : null,
      notes: formData.notes,
      administered_by: formData.administered_by,
    };

    onSubmit(submitData);
  }

  return (
    <form onSubmit={handleSubmit} className="vaccination-form">
      {errors.general && <div className="error-message">{errors.general}</div>}

      <div className="form-group">
        <label htmlFor="vaccine_id">Vaccine *</label>
        <select
          id="vaccine_id"
          name="vaccine_id"
          value={formData.vaccine_id}
          onChange={handleChange}
          required
        >
          <option value="">Select vaccine...</option>
          {VACCINE_RULES.map((vaccine) => (
            <option key={vaccine.id} value={vaccine.id}>
              {vaccine.name} ({vaccine.type === 'core' ? 'Core' : vaccine.type === 'core_conditional' ? 'Core (Conditional)' : 'Non-Core'})
            </option>
          ))}
        </select>
        {errors.vaccine_id && <span className="field-error">{errors.vaccine_id}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="date_administered">Date Administered *</label>
          <input
            type="date"
            id="date_administered"
            name="date_administered"
            value={formData.date_administered}
            onChange={handleChange}
            max={getToday()}
            required
          />
          {errors.date_administered && (
            <span className="field-error">{errors.date_administered}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="dose_number">Dose Number</label>
          <input
            type="number"
            id="dose_number"
            name="dose_number"
            value={formData.dose_number}
            onChange={handleChange}
            min="1"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="administered_by">Administered By</label>
        <input
          type="text"
          id="administered_by"
          name="administered_by"
          value={formData.administered_by}
          onChange={handleChange}
          placeholder="Veterinarian name"
        />
      </div>

      <div className="form-group">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="3"
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Add Vaccination'}
        </button>
      </div>
    </form>
  );
}

export default GuestVaccinationForm;
