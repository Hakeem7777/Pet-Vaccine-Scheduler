import { useState, useEffect } from 'react';
import { getVaccines } from '../../api/vaccines';
import { getToday } from '../../utils/dateUtils';
import './VaccinationForm.css';

function VaccinationForm({ onSubmit, onCancel, isLoading }) {
  const [vaccines, setVaccines] = useState([]);
  const [formData, setFormData] = useState({
    vaccine_id: '',
    date_administered: getToday(),
    dose_number: '',
    notes: '',
    administered_by: '',
  });
  const [errors, setErrors] = useState({});
  const [loadingVaccines, setLoadingVaccines] = useState(true);

  useEffect(() => {
    async function fetchVaccines() {
      try {
        const data = await getVaccines();
        setVaccines(data.results || data);
      } catch (err) {
        setErrors({ general: 'Failed to load vaccines.' });
      } finally {
        setLoadingVaccines(false);
      }
    }
    fetchVaccines();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});

    const submitData = {
      ...formData,
      dose_number: formData.dose_number ? parseInt(formData.dose_number, 10) : null,
    };

    try {
      await onSubmit(submitData);
    } catch (err) {
      if (err.response?.data) {
        setErrors(err.response.data);
      }
    }
  }

  if (loadingVaccines) {
    return <div className="vax-form-loading">Loading vaccines...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="vax-form">
      {errors.general && <div className="vax-error-general">{errors.general}</div>}

      <div className="vax-form-section">
        <h4 className="vax-form-section-title">Required Information</h4>

        <div className="vax-field">
          <label htmlFor="vaccine_id" className="vax-label">
            Vaccine <span className="vax-required">*</span>
          </label>
          <select
            id="vaccine_id"
            name="vaccine_id"
            value={formData.vaccine_id}
            onChange={handleChange}
            required
            className="vax-select"
          >
            <option value="">Select vaccine...</option>
            {vaccines.map((vaccine) => (
              <option key={vaccine.vaccine_id} value={vaccine.vaccine_id}>
                {vaccine.name} ({vaccine.type_display})
              </option>
            ))}
          </select>
          {errors.vaccine_id && <span className="vax-field-error">{errors.vaccine_id}</span>}
        </div>

        <div className="vax-row">
          <div className="vax-field">
            <label htmlFor="date_administered" className="vax-label">
              Date Administered <span className="vax-required">*</span>
            </label>
            <input
              type="date"
              id="date_administered"
              name="date_administered"
              value={formData.date_administered}
              onChange={handleChange}
              max={getToday()}
              required
              className="vax-input"
            />
            {errors.date_administered && (
              <span className="vax-field-error">{errors.date_administered}</span>
            )}
          </div>

          <div className="vax-field">
            <label htmlFor="dose_number" className="vax-label">Dose Number</label>
            <input
              type="number"
              id="dose_number"
              name="dose_number"
              value={formData.dose_number}
              onChange={handleChange}
              min="1"
              className="vax-input"
            />
          </div>
        </div>
      </div>

      <div className="vax-form-section">
        <h4 className="vax-form-section-title">Optional Details</h4>

        <div className="vax-field">
          <label htmlFor="administered_by" className="vax-label">Administered By</label>
          <input
            type="text"
            id="administered_by"
            name="administered_by"
            value={formData.administered_by}
            onChange={handleChange}
            placeholder="Veterinarian name"
            className="vax-input"
          />
        </div>

        <div className="vax-field">
          <label htmlFor="notes" className="vax-label">Notes</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
            className="vax-textarea"
            placeholder="Any additional notes..."
          />
        </div>
      </div>

      <div className="vax-actions">
        <button type="button" className="vax-btn-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="vax-btn-submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="vax-btn-spinner"></span>
              Saving...
            </>
          ) : (
            'Add Vaccination'
          )}
        </button>
      </div>
    </form>
  );
}

export default VaccinationForm;
