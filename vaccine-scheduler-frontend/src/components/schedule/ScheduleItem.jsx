import { useState } from 'react';
import { formatDate, getToday } from '../../utils/dateUtils';
import { addVaccination } from '../../api/vaccinations';
import FlipCard from './FlipCard';
import ExportModal from '../export/ExportModal';

// Maximum characters to show before truncating
const MAX_DESCRIPTION_LENGTH = 80;

function ScheduleItem({ item, type, dogId, dogName, dogInfo, onVaccinationAdded }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const getDaysText = () => {
    if (type === 'overdue') {
      return `${item.days_overdue} day${item.days_overdue !== 1 ? 's' : ''} overdue`;
    }
    if (item.days_until === 0) {
      return 'Due today';
    }
    return `${item.days_until} day${item.days_until !== 1 ? 's' : ''} left`;
  };

  const daysText = getDaysText();

  // Check if we have safety info to show on the back
  const hasSafetyInfo = item.side_effects_common?.length > 0 || item.side_effects_seek_vet?.length > 0;

  async function handleMarkAsDone() {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addVaccination(dogId, {
        vaccine_id: item.vaccine_id,
        date_administered: getToday(),
        dose_number: item.dose_number || null,
        notes: '',
        administered_by: '',
      });
      onVaccinationAdded?.();
    } catch (err) {
      console.error('Failed to add vaccination:', err);
      alert('Failed to mark vaccine as done. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Front of the card - current schedule item display
  const frontContent = (
    <div className={`schedule-item schedule-item--${type}${item.contraindicated ? ' schedule-item--contraindicated' : ''}${item.warning && !item.contraindicated ? ' schedule-item--has-warning' : ''}`}>
      <div className="schedule-item-header">
        <span className="schedule-vaccine">{item.vaccine}</span>
        <span className="schedule-dose">{item.dose}</span>
      </div>
      {item.contraindicated && (
        <div className="schedule-item-badge schedule-item-badge--contraindicated">
          <span className="badge-icon">&#9888;</span>
          <span className="badge-text">CONTRAINDICATED</span>
        </div>
      )}
      {item.warning && !item.contraindicated && (
        <div className="schedule-item-badge schedule-item-badge--warning">
          <span className="badge-icon">&#9888;</span>
          <span className="badge-text">VET CONSULT ADVISED</span>
        </div>
      )}
      {item.warning && (
        <div className={`schedule-item-warning ${item.contraindicated ? 'schedule-item-warning--contraindicated' : 'schedule-item-warning--caution'}`}>
          {item.warning.split(' | ').map((w, i) => {
            const severity = w.startsWith('CONTRAINDICATED') || w.startsWith('APOQUEL CONTRAINDICATION')
              ? 'contraindicated'
              : w.startsWith('FDA SEIZURE WARNING')
              ? 'fda-warning'
              : w.startsWith('ACTIVE CHEMOTHERAPY')
              ? 'contraindicated'
              : w.includes('CAUTION') || w.includes('WARNING') || w.includes('ALERT')
              ? 'warning'
              : 'note';
            return (
              <p key={i} className={`schedule-warning-text schedule-warning-text--${severity}`}>{w}</p>
            );
          })}
        </div>
      )}
      <div className="schedule-item-body">
        <span className="schedule-date">Due: {formatDate(item.date)}</span>
        <span className={`schedule-days ${type === 'overdue' ? 'schedule-days--overdue' : ''}`}>
          ({daysText})
        </span>
      </div>
      {item.date_range_start && item.date_range_end && item.date_range_start !== item.date_range_end && (
        <div className="schedule-date-range">
          Acceptable window: {formatDate(item.date_range_start)} - {formatDate(item.date_range_end)}
        </div>
      )}
      {item.notes && (
        <>
          {/* Truncated version for screen - hidden when printing */}
          <p className="schedule-notes schedule-notes--screen">
            {item.notes.length > MAX_DESCRIPTION_LENGTH && !isExpanded ? (
              <>
                {item.notes.substring(0, MAX_DESCRIPTION_LENGTH).trim()}...
                <button
                  className="schedule-notes-expand"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(true);
                  }}
                  type="button"
                >
                  more
                </button>
              </>
            ) : (
              <>
                {item.notes}
                {item.notes.length > MAX_DESCRIPTION_LENGTH && (
                  <button
                    className="schedule-notes-expand"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(false);
                    }}
                    type="button"
                  >
                    less
                  </button>
                )}
              </>
            )}
          </p>
          {/* Full version for print - hidden on screen */}
          <p className="schedule-notes schedule-notes--print">
            {item.notes}
          </p>
        </>
      )}
      <div className="schedule-item-actions">
        <button
          className="btn btn-sm btn-outline schedule-item-export-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsExportModalOpen(true);
          }}
          type="button"
        >
          Export
        </button>
        <button
          className="btn btn-sm btn-primary schedule-item-done-btn"
          onClick={handleMarkAsDone}
          disabled={isSubmitting || item.contraindicated}
          data-tour="mark-done-btn"
          title={item.contraindicated ? 'This vaccine is contraindicated based on health screening' : ''}
        >
          {isSubmitting ? 'Saving...' : item.contraindicated ? 'Contraindicated' : 'Mark as Done'}
        </button>
      </div>
      {hasSafetyInfo && (
        <div className="schedule-item-flip-hint">
          Tap card for safety info
        </div>
      )}
    </div>
  );

  // Back of the card - safety information
  const backContent = (
    <>
      <h4 className="flip-card-vaccine-name">{item.vaccine}</h4>

      {item.description && (
        <p className="vaccine-description">{item.description}</p>
      )}

      {item.side_effects_common && item.side_effects_common.length > 0 && (
        <div className="safety-section safety-section--common">
          <h4>Common Side Effects (Normal)</h4>
          <ul>
            {item.side_effects_common.map((effect, index) => (
              <li key={index}>{effect}</li>
            ))}
          </ul>
        </div>
      )}

      {item.side_effects_seek_vet && item.side_effects_seek_vet.length > 0 && (
        <div className="safety-section safety-section--warning">
          <h4>Contact Your Veterinarian If:</h4>
          <ul>
            {item.side_effects_seek_vet.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

  // If we have safety info, render as a flip card
  if (hasSafetyInfo) {
    return (
      <>
        <FlipCard
          front={frontContent}
          back={backContent}
          dataTour="schedule-item"
        />
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          dogName={dogName}
          dogInfo={dogInfo}
          singleItem={item}
        />
      </>
    );
  }

  // Otherwise, render just the front content without flip functionality
  return (
    <div data-tour="schedule-item">
      {frontContent}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        dogName={dogName}
        dogInfo={dogInfo}
        singleItem={item}
      />
    </div>
  );
}

export default ScheduleItem;
