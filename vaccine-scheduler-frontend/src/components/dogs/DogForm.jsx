import { useState, useEffect, useMemo } from 'react';
import { SEX_CHOICES } from '../../utils/constants';
import { getToday } from '../../utils/dateUtils';

// Environment options with icons and descriptions
const ENVIRONMENT_OPTIONS = [
  { key: 'env_indoor_only', label: 'Indoor', icon: '🏠', description: 'Stays inside most of the time' },
  { key: 'env_dog_parks', label: 'Dog Parks', icon: '🌳', description: 'Visits parks & public areas' },
  { key: 'env_daycare_boarding', label: 'Daycare', icon: '🏨', description: 'Attends daycare or boarding' },
  { key: 'env_travel_shows', label: 'Travel/Shows', icon: '✈️', description: 'Travels or attends shows' },
  { key: 'env_tick_exposure', label: 'Tick Areas', icon: '🦟', description: 'Woods, tall grass, or tick-prone areas' },
];

function DogForm({ dog, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    sex: '',
    birth_date: '',
    weight_kg: '',
    env_indoor_only: false,
    env_dog_parks: false,
    env_daycare_boarding: false,
    env_travel_shows: false,
    env_tick_exposure: false,
  });
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);

  // Calculate form completion percentage
  const completionPercentage = useMemo(() => {
    const fields = [
      { value: formData.name, required: true },
      { value: formData.breed, required: false },
      { value: formData.sex, required: false },
      { value: formData.birth_date, required: true },
      { value: formData.weight_kg, required: false },
    ];
    const envSelected = ENVIRONMENT_OPTIONS.some(opt => formData[opt.key]);

    let filled = 0;
    let total = 0;

    fields.forEach(field => {
      if (field.required) {
        total += 2; // Required fields count more
        if (field.value) filled += 2;
      } else {
        total += 1;
        if (field.value) filled += 1;
      }
    });

    total += 1; // Environment section
    if (envSelected) filled += 1;

    return Math.round((filled / total) * 100);
  }, [formData]);

  useEffect(() => {
    if (dog) {
      setFormData({
        name: dog.name || '',
        breed: dog.breed || '',
        sex: dog.sex || '',
        birth_date: dog.birth_date || '',
        weight_kg: dog.weight_kg || '',
        env_indoor_only: dog.env_indoor_only || false,
        env_dog_parks: dog.env_dog_parks || false,
        env_daycare_boarding: dog.env_daycare_boarding || false,
        env_travel_shows: dog.env_travel_shows || false,
        env_tick_exposure: dog.env_tick_exposure || false,
      });
    }
  }, [dog]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});

    const submitData = {
      ...formData,
      weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
    };

    // Remove empty optional fields so the backend uses model defaults
    if (!submitData.sex) delete submitData.sex;
    if (!submitData.breed) delete submitData.breed;

    try {
      await onSubmit(submitData);
    } catch (err) {
      if (err.response?.data) {
        setErrors(err.response.data);
      }
    }
  }

  return (
    <div className="dog-form-wrapper">
      {/* Hero Header */}
      <div className="dog-form-header">
        <div className="dog-form-header-icon">
          <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
            <path d="M4.5 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3-6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm9 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm-4.5 3c0 2.5-2 4.5-4.5 4.5S6 17.5 6 15c0-1.5.5-2.5 1.5-3.5L9 10l1.5 1.5c.5.5 1 1.5 1 2.5 0 .6-.4 1-1 1s-1-.4-1-1c0-.3-.1-.6-.3-.8L9 13l-.2.2c-.6.6-1.3 1.3-1.3 2.3 0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5c0-.3-.1-.6-.2-.9l1.4-1.4c.5.7.8 1.5.8 2.3z"/>
          </svg>
        </div>
        <h3 className="dog-form-header-title">{dog ? 'Update Dog Details' : 'Add a New Dog'}</h3>
        <p className="dog-form-header-subtitle">
          {dog ? 'Keep your pup\'s information up to date' : 'Tell us about your furry friend'}
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="dog-form-progress">
        <div className="dog-form-progress-bar">
          <div
            className="dog-form-progress-fill"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <span className="dog-form-progress-text">{completionPercentage}% complete</span>
      </div>

      <form onSubmit={handleSubmit} className="dog-form">
        {/* Name Field - Floating Label */}
        <div className={`form-group form-group-floating ${focusedField === 'name' || formData.name ? 'has-value' : ''}`}>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
            required
            placeholder=" "
          />
          <label htmlFor="name">Name *</label>
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        {/* Breed Field - Floating Label */}
        <div className={`form-group form-group-floating ${focusedField === 'breed' || formData.breed ? 'has-value' : ''}`}>
          <input
            type="text"
            id="breed"
            name="breed"
            value={formData.breed}
            onChange={handleChange}
            onFocus={() => setFocusedField('breed')}
            onBlur={() => setFocusedField(null)}
            placeholder=" "
          />
          <label htmlFor="breed">Breed</label>
        </div>

        <div className="form-row">
          {/* Sex Field */}
          <div className={`form-group form-group-floating ${focusedField === 'sex' || formData.sex ? 'has-value' : ''}`}>
            <select
              id="sex"
              name="sex"
              value={formData.sex}
              onChange={handleChange}
              onFocus={() => setFocusedField('sex')}
              onBlur={() => setFocusedField(null)}
            >
              <option value=""></option>
              {SEX_CHOICES.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
            <label htmlFor="sex">Sex</label>
          </div>

          {/* Date of Birth Field */}
          <div className={`form-group form-group-floating ${focusedField === 'birth_date' || formData.birth_date ? 'has-value' : ''}`}>
            <input
              type="date"
              id="birth_date"
              name="birth_date"
              value={formData.birth_date}
              onChange={handleChange}
              onFocus={() => setFocusedField('birth_date')}
              onBlur={() => setFocusedField(null)}
              max={getToday()}
              required
            />
            <label htmlFor="birth_date">Date of Birth *</label>
            {errors.birth_date && <span className="field-error">{errors.birth_date}</span>}
          </div>
        </div>

        {/* Weight Field - Floating Label */}
        <div className={`form-group form-group-floating ${focusedField === 'weight_kg' || formData.weight_kg ? 'has-value' : ''}`}>
          <input
            type="number"
            id="weight_kg"
            name="weight_kg"
            value={formData.weight_kg}
            onChange={handleChange}
            onFocus={() => setFocusedField('weight_kg')}
            onBlur={() => setFocusedField(null)}
            min="0.1"
            step="0.1"
            placeholder=" "
          />
          <label htmlFor="weight_kg">Weight (kg)</label>
        </div>

        {/* Living Environment - Visual Cards */}
        <fieldset className="form-fieldset form-fieldset-env">
          <legend>Living Environment</legend>
          <div className="env-card-group">
            {ENVIRONMENT_OPTIONS.map((option) => (
              <label
                key={option.key}
                className={`env-card ${formData[option.key] ? 'env-card--selected' : ''}`}
              >
                <input
                  type="checkbox"
                  name={option.key}
                  checked={formData[option.key]}
                  onChange={handleChange}
                />
                <span className="env-card-icon">{option.icon}</span>
                <span className="env-card-label">{option.label}</span>
                <span className="env-card-description">{option.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Saving...' : dog ? 'Update' : 'Add Dog'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default DogForm;
