import { useState, useEffect, useMemo } from 'react';
import { SEX_CHOICES } from '../../utils/constants';
import { getToday } from '../../utils/dateUtils';
import {
  MEDICAL_CONDITIONS,
  MEDICATION_CATALOG,
  ISOXAZOLINE_MEDS,
  getMedicationCategoriesForConditions,
} from '../../utils/medicalConstants';

// Environment options with icons and descriptions
const ENVIRONMENT_OPTIONS = [
  { key: 'env_indoor_only', label: 'Indoor', icon: '🏠', description: 'Stays inside most of the time' },
  { key: 'env_dog_parks', label: 'Dog Parks', icon: '🌳', description: 'Visits parks & public areas' },
  { key: 'env_daycare_boarding', label: 'Daycare', icon: '🏨', description: 'Attends daycare or boarding' },
  { key: 'env_travel_shows', label: 'Travel/Shows', icon: '✈️', description: 'Travels or attends shows' },
  { key: 'env_tick_exposure', label: 'Tick Areas', icon: '🦟', description: 'Woods, tall grass, or tick-prone areas' },
];

// Health screening questions with tooltips and sources
const HEALTH_SCREENING_QUESTIONS = [
  {
    key: 'health_vaccine_reaction',
    label: 'Has your dog ever had a reaction to a vaccine?',
    options: [
      { value: 'no', label: 'No' },
      { value: 'yes', label: 'Yes' },
      { value: 'unsure', label: 'Not sure' },
    ],
    tooltip: 'Dogs with previous vaccine reactions are at higher risk for future reactions. All vaccines in the schedule will be flagged — including DHPP, Rabies, Leptospirosis, Bordetella, Canine Influenza, and Lyme. Your vet may recommend pre-treatment with antihistamines, titer testing instead of revaccination, or adjusted protocols.',
    source: 'AAHA Canine Vaccination Guidelines, 2024',
  },
  {
    key: 'health_prescription_meds',
    label: 'Is your dog currently taking prescription medications?',
    options: [
      { value: 'no', label: 'No' },
      { value: 'yes', label: 'Yes' },
      { value: 'unsure', label: 'Not sure' },
    ],
    tooltip: 'Certain medications can interact with vaccines or affect immune response. All vaccines (DHPP, Rabies, Leptospirosis, Bordetella, Canine Influenza, Lyme) will be flagged for veterinary review to determine safe vaccination timing.',
    source: 'WSAVA Vaccination Guidelines, 2024',
  },
  {
    key: 'health_chronic_condition',
    label: 'Has a veterinarian diagnosed your dog with a long-term medical condition?',
    options: [
      { value: 'no', label: 'No' },
      { value: 'yes', label: 'Yes' },
      { value: 'unsure', label: 'Not sure' },
    ],
    tooltip: 'Chronic conditions such as kidney disease, liver disease, or diabetes can affect how your dog responds to vaccines. All vaccines (DHPP, Rabies, Leptospirosis, Bordetella, Canine Influenza, Lyme) will be flagged for veterinary review.',
    source: 'AAHA Canine Vaccination Guidelines, 2024',
  },
  {
    key: 'health_immune_condition',
    label: 'Has your dog ever been diagnosed with an immune-related condition?',
    options: [
      { value: 'no', label: 'No' },
      { value: 'yes', label: 'Yes' },
      { value: 'unsure', label: 'Not sure' },
    ],
    tooltip: 'Immune-mediated diseases (e.g., IMHA, ITP, autoimmune skin conditions) can be triggered or worsened by vaccination. All vaccines will be flagged — DHPP and Bordetella (Intranasal) carry extra risk as modified-live vaccines. Titer testing is recommended as an alternative to revaccination, especially for DHPP and Rabies.',
    source: 'AAHA 2024; WSAVA Vaccination Guidelines, 2024',
  },
  {
    key: 'health_immunosuppressive_meds',
    label: 'Is your dog currently receiving immunosuppressive medications (steroids, chemo)?',
    options: [
      { value: 'no', label: 'No' },
      { value: 'yes', label: 'Yes' },
      { value: 'unsure', label: 'Not sure' },
    ],
    tooltip: 'Modified-live vaccines can cause disease in immunosuppressed patients. DHPP and Bordetella (Intranasal) will be marked as CONTRAINDICATED. Killed vaccines — Rabies, Leptospirosis, Canine Influenza, Lyme, and Bordetella (Injectable) — may be ineffective and require veterinary consultation. Vaccination should generally be delayed until at least 2 weeks after stopping immunosuppressive therapy.',
    source: 'WSAVA Vaccination Guidelines, 2024',
  },
  {
    key: 'health_pregnant_breeding',
    label: 'Is your dog currently pregnant or being used for breeding?',
    options: [
      { value: 'no', label: 'No' },
      { value: 'yes', label: 'Yes' },
      { value: 'na', label: 'N/A' },
    ],
    tooltip: 'Modified-live vaccines can cross the placenta and cause birth defects or fetal death. DHPP and Bordetella (Intranasal) will be marked as CONTRAINDICATED. Killed vaccines — Rabies, Leptospirosis, Canine Influenza, Lyme, and Bordetella (Injectable) — should only be given during pregnancy when absolutely necessary. Ideally, all vaccinations should be completed before breeding.',
    source: 'WSAVA 2024; Veterinary Information Network (VIN)',
  },
];

const HEALTH_SOURCES = [
  {
    abbrev: 'AAHA 2024',
    full: 'American Animal Hospital Association 2024',
    url: 'https://www.aaha.org/resources/2022-aaha-canine-vaccination-guidelines/',
  },
  {
    abbrev: 'WSAVA 2024',
    full: 'World Small Animal Veterinary Association 2024',
    url: 'https://wsava.org/global-guidelines/vaccination-guidelines/',
  },
  {
    abbrev: 'VIN',
    full: 'Veterinary Information Network',
    url: 'https://veterinarypartner.vin.com/',
  },
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
    health_vaccine_reaction: 'no',
    health_prescription_meds: 'no',
    health_chronic_condition: 'no',
    health_immune_condition: 'no',
    health_immunosuppressive_meds: 'no',
    health_pregnant_breeding: 'no',
    medical_conditions: [],
    medications: {},
  });
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [showSources, setShowSources] = useState(false);

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
    const healthAnswered = HEALTH_SCREENING_QUESTIONS.some(
      q => formData[q.key] !== 'no' && formData[q.key] !== 'na'
    );

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

    total += 1; // Health screening section
    if (healthAnswered) filled += 1;

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
        health_vaccine_reaction: dog.health_vaccine_reaction || 'no',
        health_prescription_meds: dog.health_prescription_meds || 'no',
        health_chronic_condition: dog.health_chronic_condition || 'no',
        health_immune_condition: dog.health_immune_condition || 'no',
        health_immunosuppressive_meds: dog.health_immunosuppressive_meds || 'no',
        health_pregnant_breeding: dog.health_pregnant_breeding || 'no',
        medical_conditions: dog.medical_conditions || [],
        medications: dog.medications || {},
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

  function handleConditionToggle(conditionId) {
    setFormData((prev) => {
      const conditions = prev.medical_conditions.includes(conditionId)
        ? prev.medical_conditions.filter((c) => c !== conditionId)
        : [...prev.medical_conditions, conditionId];

      // Clean up medications for removed conditions
      const relevantCategories = getMedicationCategoriesForConditions(conditions);
      const relevantKeys = new Set(relevantCategories.map((c) => c.key));
      const cleanedMeds = {};
      for (const [key, value] of Object.entries(prev.medications)) {
        if (relevantKeys.has(key)) {
          cleanedMeds[key] = value;
        }
      }

      return { ...prev, medical_conditions: conditions, medications: cleanedMeds };
    });
  }

  function handleMedicationToggle(categoryKey, medId) {
    setFormData((prev) => {
      const currentMeds = prev.medications[categoryKey] || [];
      const updatedMeds = currentMeds.includes(medId)
        ? currentMeds.filter((m) => m !== medId)
        : [...currentMeds, medId];

      return {
        ...prev,
        medications: { ...prev.medications, [categoryKey]: updatedMeds },
      };
    });
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

        {/* Health Screening */}
        <fieldset className="form-fieldset form-fieldset-health">
          <legend>Health Screening</legend>
          <p className="health-screening-intro">
            These questions help identify potential vaccine contraindications.
            Answer to the best of your knowledge.
          </p>

          <div className="health-questions">
            {HEALTH_SCREENING_QUESTIONS.map((question) => (
              <div key={question.key} className="health-question">
                <div className="health-question-label">
                  <span>{question.label}</span>
                  <button
                    type="button"
                    className="health-tooltip-trigger"
                    onClick={() => setActiveTooltip(
                      activeTooltip === question.key ? null : question.key
                    )}
                    aria-label={`Why this matters: ${question.label}`}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                {activeTooltip === question.key && (
                  <div className="health-tooltip">
                    <p>{question.tooltip}</p>
                    <cite className="health-tooltip-source">Source: {question.source}</cite>
                  </div>
                )}

                <div className="health-radio-group">
                  {question.options.map((option) => (
                    <label
                      key={option.value}
                      className={`health-radio-option ${
                        formData[question.key] === option.value ? 'health-radio-option--selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.key}
                        value={option.value}
                        checked={formData[question.key] === option.value}
                        onChange={handleChange}
                      />
                      <span className="health-radio-label">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Collapsible Sources Section */}
          <div className="health-sources-section">
            <button
              type="button"
              className="health-sources-toggle"
              onClick={() => setShowSources(!showSources)}
            >
              {showSources ? 'Hide' : 'View'} Reference Sources
              <span className={`health-sources-chevron ${showSources ? 'health-sources-chevron--open' : ''}`}>
                &#9660;
              </span>
            </button>

            {showSources && (
              <ul className="health-sources-list">
                {HEALTH_SOURCES.map((source, index) => (
                  <li key={index}>
                    <strong>{source.abbrev}:</strong>{' '}
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      {source.full}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </fieldset>

        {/* Medical Conditions & Medications */}
        <fieldset className="form-fieldset form-fieldset-conditions">
          <legend>Medical Conditions</legend>
          <p className="health-screening-intro">
            If your dog has been diagnosed with any of these conditions, selecting them
            will provide condition-specific vaccine guidance and medication warnings.
          </p>

          <div className="env-card-group">
            {MEDICAL_CONDITIONS.map((condition) => (
              <label
                key={condition.id}
                className={`env-card ${formData.medical_conditions.includes(condition.id) ? 'env-card--selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={formData.medical_conditions.includes(condition.id)}
                  onChange={() => handleConditionToggle(condition.id)}
                />
                <span className="env-card-icon">{condition.icon}</span>
                <span className="env-card-label">{condition.label}</span>
                <span className="env-card-description">{condition.description}</span>
              </label>
            ))}
          </div>

          {formData.medical_conditions.length > 0 && (
            <div className="medication-categories">
              <p className="medication-categories-intro">
                Select the medications your dog is currently taking:
              </p>
              {getMedicationCategoriesForConditions(formData.medical_conditions).map((category) => (
                <div key={category.key} className="medication-category">
                  <h4 className="medication-category-label">{category.label}</h4>
                  <div className="medication-checklist">
                    {category.options.map((med) => (
                      <label
                        key={med.id}
                        className={`medication-option ${
                          (formData.medications[category.key] || []).includes(med.id)
                            ? 'medication-option--selected'
                            : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={(formData.medications[category.key] || []).includes(med.id)}
                          onChange={() => handleMedicationToggle(category.key, med.id)}
                        />
                        <span>{med.label}</span>
                        {med.drugClass === 'isoxazoline' && (
                          <span className="medication-warning-badge">FDA Warning</span>
                        )}
                      </label>
                    ))}
                  </div>

                  {/* Inline isoxazoline warning for epileptic dogs */}
                  {category.key === 'flea_tick' &&
                    formData.medical_conditions.includes('epilepsy') &&
                    (formData.medications.flea_tick || []).some((m) => ISOXAZOLINE_MEDS.has(m)) && (
                      <div className="medication-inline-warning">
                        <strong>FDA Seizure Warning:</strong> Isoxazoline flea/tick products
                        (NexGard, Bravecto, Simparica, Credelio) have an FDA warning for
                        seizures, tremors, and ataxia in dogs. These should be <strong>avoided</strong> in
                        epileptic dogs. Safer alternatives include Frontline (fipronil),
                        Revolution (selamectin), or Comfortis (spinosad).
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
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
