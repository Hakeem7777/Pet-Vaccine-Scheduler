import { useState, useRef } from 'react';
import { extractFromDocument, applyExtraction, extractFromDocumentNew, createDog } from '../../api/dogs';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatDate, getToday } from '../../utils/dateUtils';
import { SEX_CHOICES } from '../../utils/constants';

const ENVIRONMENT_OPTIONS = [
  { key: 'env_indoor_only', label: 'Indoor', icon: '\u{1F3E0}', description: 'Stays inside most of the time' },
  { key: 'env_dog_parks', label: 'Dog Parks', icon: '\u{1F333}', description: 'Visits parks & public areas' },
  { key: 'env_daycare_boarding', label: 'Daycare', icon: '\u{1F3E8}', description: 'Attends daycare or boarding' },
  { key: 'env_travel_shows', label: 'Travel/Shows', icon: '\u{2708}\u{FE0F}', description: 'Travels or attends shows' },
  { key: 'env_tick_exposure', label: 'Tick Areas', icon: '\u{1F99F}', description: 'Woods, tall grass, or tick-prone areas' },
];

const UPLOAD_STATES = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  REVIEWING: 'reviewing',
  FILLING_REQUIRED: 'filling_required',
  APPLYING: 'applying',
  COMPLETE: 'complete',
  ERROR: 'error',
};

function DocumentUploadModal({ dogId, dog, onClose, onSuccess, mode = 'update' }) {
  // mode: 'update' = updating existing dog, 'create' = creating new dog from document
  const isCreateMode = mode === 'create';

  const [state, setState] = useState(UPLOAD_STATES.IDLE);
  const [error, setError] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [selectedFields, setSelectedFields] = useState({});
  const [applyResult, setApplyResult] = useState(null);
  const [requiredFields, setRequiredFields] = useState({ name: '', birth_date: '' });
  const [editableLifestyle, setEditableLifestyle] = useState({});
  const fileInputRef = useRef(null);

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File size exceeds 10MB limit');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('File type not supported. Please upload an image or PDF.');
      return;
    }

    setState(UPLOAD_STATES.UPLOADING);
    setError(null);

    try {
      let result;
      if (isCreateMode) {
        result = await extractFromDocumentNew(file);
      } else {
        result = await extractFromDocument(dogId, file);
      }
      setExtractedData(result);

      // Pre-select all fields that have values
      const initialSelection = {};
      if (result.dog_info) {
        Object.entries(result.dog_info).forEach(([key, value]) => {
          if (value !== null) initialSelection[`dog_info.${key}`] = true;
        });
      }
      if (result.lifestyle) {
        Object.entries(result.lifestyle).forEach(([key, value]) => {
          if (value !== null) initialSelection[`lifestyle.${key}`] = true;
        });
      }
      if (result.vaccinations?.length) {
        result.vaccinations.forEach((_, idx) => {
          initialSelection[`vaccination.${idx}`] = true;
        });
      }
      setSelectedFields(initialSelection);

      // In create mode, pre-fill required fields from extracted data
      if (isCreateMode) {
        setRequiredFields({
          name: result.dog_info?.name || '',
          birth_date: result.dog_info?.birth_date || '',
        });
      }

      // Initialize editable lifestyle from extracted data
      const initialLifestyle = {};
      ENVIRONMENT_OPTIONS.forEach(({ key }) => {
        // Use extracted value if available, otherwise default to false
        initialLifestyle[key] = result.lifestyle?.[key] ?? false;
      });
      setEditableLifestyle(initialLifestyle);

      setState(UPLOAD_STATES.REVIEWING);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process document');
      setState(UPLOAD_STATES.ERROR);
    }
  }

  function toggleField(fieldKey) {
    setSelectedFields((prev) => ({
      ...prev,
      [fieldKey]: !prev[fieldKey],
    }));
  }

  function handleRequiredFieldChange(e) {
    const { name, value } = e.target;
    setRequiredFields((prev) => ({ ...prev, [name]: value }));
  }

  async function handleApply() {
    // In create mode, check required fields first
    if (isCreateMode) {
      if (!requiredFields.name?.trim()) {
        setError('Dog name is required');
        return;
      }
      if (!requiredFields.birth_date) {
        setError('Birth date is required');
        return;
      }
    }

    setState(UPLOAD_STATES.APPLYING);
    setError(null);

    // Build payload from selected fields
    const payload = {
      dog_info: {},
      lifestyle: {},
      vaccinations: [],
    };

    Object.entries(selectedFields).forEach(([key, selected]) => {
      if (!selected) return;

      const [category, field] = key.split('.');

      if (category === 'dog_info' && extractedData.dog_info?.[field] !== null) {
        payload.dog_info[field] = extractedData.dog_info[field];
      } else if (category === 'vaccination') {
        const idx = parseInt(field, 10);
        if (extractedData.vaccinations?.[idx]) {
          payload.vaccinations.push(extractedData.vaccinations[idx]);
        }
      }
    });

    // Always include editable lifestyle values (user can modify these)
    payload.lifestyle = { ...editableLifestyle };

    try {
      if (isCreateMode) {
        // Create new dog flow
        // 1. Build dog data from required fields + extracted data
        const dogData = {
          name: requiredFields.name.trim(),
          birth_date: requiredFields.birth_date,
          ...payload.dog_info,
          ...payload.lifestyle,
        };
        // Override with required fields (user input takes priority)
        dogData.name = requiredFields.name.trim();
        dogData.birth_date = requiredFields.birth_date;

        // 2. Create the dog
        const newDog = await createDog(dogData);

        // 3. Apply vaccinations if any
        let vaccinationsAdded = 0;
        let vaccinationsSkipped = 0;
        const skippedReasons = [];

        if (payload.vaccinations.length > 0) {
          try {
            const vacResult = await applyExtraction(newDog.id, {
              dog_info: {},
              lifestyle: {},
              vaccinations: payload.vaccinations,
            });
            vaccinationsAdded = vacResult.vaccinations_added || 0;
            vaccinationsSkipped = vacResult.vaccinations_skipped || 0;
            if (vacResult.skipped_reasons) {
              skippedReasons.push(...vacResult.skipped_reasons);
            }
          } catch (vacErr) {
            // Dog was created, but vaccinations failed
            skippedReasons.push('Failed to add vaccinations: ' + (vacErr.response?.data?.error || vacErr.message));
          }
        }

        setApplyResult({
          dog_created: true,
          dog: newDog,
          vaccinations_added: vaccinationsAdded,
          vaccinations_skipped: vaccinationsSkipped,
          skipped_reasons: skippedReasons,
        });
        setState(UPLOAD_STATES.COMPLETE);
      } else {
        // Update existing dog flow
        const result = await applyExtraction(dogId, payload);
        setApplyResult(result);
        setState(UPLOAD_STATES.COMPLETE);
      }
    } catch (err) {
      setError(err.response?.data?.error || (isCreateMode ? 'Failed to create dog' : 'Failed to apply changes'));
      setState(UPLOAD_STATES.ERROR);
    }
  }

  function handleDone() {
    if (isCreateMode) {
      if (applyResult?.dog_created) {
        onSuccess(applyResult.dog);
      }
    } else {
      if (applyResult?.dog_updated || applyResult?.vaccinations_added > 0) {
        onSuccess();
      }
    }
    onClose();
  }

  function getSexLabel(sex) {
    const choice = SEX_CHOICES.find((s) => s.value === sex);
    return choice?.label || sex;
  }

  // Check if required fields are missing for create mode
  function getMissingRequiredFields() {
    if (!isCreateMode) return [];
    const missing = [];
    if (!extractedData?.dog_info?.name && !requiredFields.name) missing.push('name');
    if (!extractedData?.dog_info?.birth_date && !requiredFields.birth_date) missing.push('birth_date');
    return missing;
  }

  // Render based on state
  if (state === UPLOAD_STATES.IDLE || state === UPLOAD_STATES.ERROR) {
    return (
      <div className="document-upload">
        <div className="upload-intro">
          {isCreateMode ? (
            <>
              <p>Upload a document to quickly add a new dog. We'll extract:</p>
              <ul>
                <li>Dog information (name, breed, birth date, etc.)</li>
                <li>Vaccination records</li>
                <li>Lifestyle information</li>
              </ul>
              <p className="upload-note">You can review and edit before saving.</p>
            </>
          ) : (
            <>
              <p>Upload a document containing your dog's information, such as:</p>
              <ul>
                <li>Vaccination records from your vet</li>
                <li>Pet health certificates</li>
                <li>Handwritten notes</li>
                <li>Photos of documents</li>
              </ul>
            </>
          )}
          <p className="upload-formats">Supported formats: JPG, PNG, GIF, WebP, PDF (max 10MB)</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <div className="form-actions">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
            Select Document
          </button>
        </div>
      </div>
    );
  }

  if (state === UPLOAD_STATES.UPLOADING) {
    return (
      <div className="document-upload">
        <div className="upload-processing">
          <LoadingSpinner />
          <p>Processing document with AI...</p>
          <p className="processing-hint">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  // Helper to check if a vaccination has a warning
  function getVaccinationWarning(vax) {
    if (!extractedData?.warnings) return null;
    return extractedData.warnings.find(
      (w) =>
        w.field === 'vaccination' &&
        w.vaccine_name === vax.vaccine_name &&
        w.date === vax.date_administered
    );
  }

  // Count errors vs warnings (only for update mode)
  const errorWarnings = extractedData?.warnings?.filter((w) => w.severity === 'error') || [];
  const warningWarnings = extractedData?.warnings?.filter((w) => w.severity === 'warning') || [];

  if (state === UPLOAD_STATES.REVIEWING) {
    const confidence = extractedData?.confidence?.overall || 'low';
    const confidenceClass = `confidence-${confidence}`;

    const hasData =
      (extractedData?.dog_info && Object.values(extractedData.dog_info).some((v) => v !== null)) ||
      (extractedData?.lifestyle && Object.values(extractedData.lifestyle).some((v) => v !== null)) ||
      extractedData?.vaccinations?.length > 0;

    // Check if there are critical errors (only in update mode)
    const hasCriticalErrors = !isCreateMode && errorWarnings.length > 0;

    // Check for missing required fields in create mode
    const missingRequired = getMissingRequiredFields();
    const hasRequiredFieldsIssue = isCreateMode && missingRequired.length > 0;

    return (
      <div className="document-upload document-review">
        {/* Critical Warnings Banner - Show first if there are errors (update mode only) */}
        {hasCriticalErrors && (
          <div className="warnings-banner warnings-error">
            <div className="warnings-header">
              <strong>Potential Document Mismatch Detected</strong>
            </div>
            <div className="warnings-content">
              <p>This document may not belong to {dog.name}:</p>
              <ul className="warnings-list">
                {errorWarnings.map((warning, idx) => (
                  <li key={idx}>{warning.message}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Non-critical warnings (update mode only) */}
        {!isCreateMode && warningWarnings.length > 0 && (
          <div className="warnings-banner warnings-caution">
            <div className="warnings-header">
              <strong>Please Verify</strong>
            </div>
            <div className="warnings-content">
              <ul className="warnings-list">
                {warningWarnings.map((warning, idx) => (
                  <li key={idx}>{warning.message}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className={`confidence-banner ${confidenceClass}`}>
          <strong>Extraction Confidence: {confidence.toUpperCase()}</strong>
          {extractedData?.confidence?.notes && (
            <span className="confidence-notes">{extractedData.confidence.notes}</span>
          )}
        </div>

        <p className="review-instructions">
          {isCreateMode
            ? 'Review the extracted information. Fill in any missing required fields below.'
            : 'Review the extracted information below. Uncheck any fields you don\'t want to update.'}
        </p>

        {/* Required Fields Section (Create Mode Only) */}
        {isCreateMode && (
          <fieldset className="extraction-section required-fields-section">
            <legend>Required Information</legend>
            <div className="required-fields-form">
              <div className="form-group">
                <label htmlFor="req-name">
                  Dog Name *
                  {extractedData?.dog_info?.name && (
                    <span className="extracted-hint">(extracted: {extractedData.dog_info.name})</span>
                  )}
                </label>
                <input
                  type="text"
                  id="req-name"
                  name="name"
                  value={requiredFields.name}
                  onChange={handleRequiredFieldChange}
                  placeholder="Enter dog's name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="req-birth_date">
                  Birth Date *
                  {extractedData?.dog_info?.birth_date && (
                    <span className="extracted-hint">(extracted: {formatDate(extractedData.dog_info.birth_date)})</span>
                  )}
                </label>
                <input
                  type="date"
                  id="req-birth_date"
                  name="birth_date"
                  value={requiredFields.birth_date}
                  onChange={handleRequiredFieldChange}
                  max={getToday()}
                  required
                />
              </div>
            </div>
          </fieldset>
        )}

        {/* Dog Info Section */}
        {extractedData?.dog_info &&
          Object.values(extractedData.dog_info).some((v) => v !== null) && (
            <fieldset className="extraction-section">
              <legend>{isCreateMode ? 'Additional Dog Information' : 'Dog Information'}</legend>
              <div className="extraction-fields">
                {!isCreateMode && extractedData.dog_info.name && (
                  <label className="extraction-field">
                    <input
                      type="checkbox"
                      checked={selectedFields['dog_info.name'] || false}
                      onChange={() => toggleField('dog_info.name')}
                    />
                    <span className="field-label">Name:</span>
                    <span className="field-value">{extractedData.dog_info.name}</span>
                    <span className="field-current">Current: {dog.name}</span>
                  </label>
                )}
                {extractedData.dog_info.breed && (
                  <label className="extraction-field">
                    <input
                      type="checkbox"
                      checked={selectedFields['dog_info.breed'] || false}
                      onChange={() => toggleField('dog_info.breed')}
                    />
                    <span className="field-label">Breed:</span>
                    <span className="field-value">{extractedData.dog_info.breed}</span>
                    {!isCreateMode && <span className="field-current">Current: {dog.breed || 'Not set'}</span>}
                  </label>
                )}
                {!isCreateMode && extractedData.dog_info.birth_date && (
                  <label className="extraction-field">
                    <input
                      type="checkbox"
                      checked={selectedFields['dog_info.birth_date'] || false}
                      onChange={() => toggleField('dog_info.birth_date')}
                    />
                    <span className="field-label">Birth Date:</span>
                    <span className="field-value">{formatDate(extractedData.dog_info.birth_date)}</span>
                    <span className="field-current">Current: {formatDate(dog.birth_date)}</span>
                  </label>
                )}
                {extractedData.dog_info.weight_kg && (
                  <label className="extraction-field">
                    <input
                      type="checkbox"
                      checked={selectedFields['dog_info.weight_kg'] || false}
                      onChange={() => toggleField('dog_info.weight_kg')}
                    />
                    <span className="field-label">Weight:</span>
                    <span className="field-value">{extractedData.dog_info.weight_kg} kg</span>
                    {!isCreateMode && (
                      <span className="field-current">
                        Current: {dog.weight_kg ? `${dog.weight_kg} kg` : 'Not set'}
                      </span>
                    )}
                  </label>
                )}
                {extractedData.dog_info.sex && (
                  <label className="extraction-field">
                    <input
                      type="checkbox"
                      checked={selectedFields['dog_info.sex'] || false}
                      onChange={() => toggleField('dog_info.sex')}
                    />
                    <span className="field-label">Sex:</span>
                    <span className="field-value">{getSexLabel(extractedData.dog_info.sex)}</span>
                    {!isCreateMode && <span className="field-current">Current: {getSexLabel(dog.sex)}</span>}
                  </label>
                )}
              </div>
            </fieldset>
          )}

        {/* Lifestyle/Environment Section - Always shown and editable */}
        <fieldset className="extraction-section">
          <legend>Environment</legend>
          <p className="environment-hint">Select all that apply to your dog's lifestyle:</p>
          <div className="environment-options">
            {ENVIRONMENT_OPTIONS.map(({ key, label, icon, description }) => (
              <button
                key={key}
                type="button"
                className={`environment-option ${editableLifestyle[key] ? 'selected' : ''}`}
                onClick={() => setEditableLifestyle(prev => ({ ...prev, [key]: !prev[key] }))}
                title={description}
              >
                <span className="env-icon">{icon}</span>
                <span className="env-label">{label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Vaccinations Section */}
        {extractedData?.vaccinations?.length > 0 && (
          <fieldset className="extraction-section">
            <legend>Vaccinations ({extractedData.vaccinations.length} found)</legend>
            <div className="extraction-vaccinations">
              {extractedData.vaccinations.map((vax, idx) => {
                const vaxWarning = !isCreateMode ? getVaccinationWarning(vax) : null;
                const hasError = vaxWarning?.severity === 'error';
                return (
                  <label
                    key={idx}
                    className={`extraction-vaccination ${hasError ? 'vaccination-has-error' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields[`vaccination.${idx}`] || false}
                      onChange={() => toggleField(`vaccination.${idx}`)}
                    />
                    <div className="vaccination-details">
                      <strong>{vax.vaccine_name}</strong>
                      {vax.date_administered && (
                        <span className={`vax-date ${hasError ? 'vax-date-error' : ''}`}>
                          {formatDate(vax.date_administered)}
                          {hasError && ' (BEFORE BIRTH)'}
                        </span>
                      )}
                      {vax.dose_number && <span className="vax-dose">Dose #{vax.dose_number}</span>}
                      {vax.administered_by && <span className="vax-by">by {vax.administered_by}</span>}
                    </div>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {/* No data extracted */}
        {!hasData && (
          <div className="empty-state">No information could be extracted from this document.</div>
        )}

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-outline"
            onClick={() => {
              setState(UPLOAD_STATES.IDLE);
              setExtractedData(null);
              setSelectedFields({});
              setEditableLifestyle({});
              setError(null);
            }}
          >
            Upload Different Document
          </button>
          <button
            className="btn btn-primary"
            onClick={handleApply}
            disabled={
              isCreateMode
                ? !requiredFields.name?.trim() || !requiredFields.birth_date
                : Object.values(selectedFields).filter(Boolean).length === 0
            }
          >
            {isCreateMode ? 'Add' : 'Apply Selected Changes'}
          </button>
        </div>
      </div>
    );
  }

  if (state === UPLOAD_STATES.APPLYING) {
    return (
      <div className="document-upload">
        <div className="upload-processing">
          <LoadingSpinner />
          <p>{isCreateMode ? 'Creating dog...' : 'Applying changes...'}</p>
        </div>
      </div>
    );
  }

  if (state === UPLOAD_STATES.COMPLETE) {
    return (
      <div className="document-upload">
        <div className="apply-results">
          {isCreateMode ? (
            <>
              <h4>Dog Created Successfully!</h4>
              {applyResult?.dog && (
                <div className="result-section">
                  <p className="result-success">
                    Created <strong>{applyResult.dog.name}</strong>
                  </p>
                </div>
              )}
            </>
          ) : (
            <h4>Changes Applied Successfully</h4>
          )}

          {!isCreateMode && applyResult?.fields_updated?.length > 0 && (
            <div className="result-section">
              <p className="result-success">
                Updated {applyResult.fields_updated.length} field(s):{' '}
                {applyResult.fields_updated.join(', ')}
              </p>
            </div>
          )}

          {applyResult?.vaccinations_added > 0 && (
            <div className="result-section">
              <p className="result-success">
                Added {applyResult.vaccinations_added} vaccination record(s)
              </p>
            </div>
          )}

          {applyResult?.vaccinations_skipped > 0 && (
            <div className="result-section">
              <p className="result-warning">
                Skipped {applyResult.vaccinations_skipped} vaccination(s):
              </p>
              <ul className="skipped-list">
                {applyResult.skipped_reasons?.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {!isCreateMode && !applyResult?.dog_updated && applyResult?.vaccinations_added === 0 && (
            <p className="result-info">No changes were made.</p>
          )}
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" onClick={handleDone}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default DocumentUploadModal;
