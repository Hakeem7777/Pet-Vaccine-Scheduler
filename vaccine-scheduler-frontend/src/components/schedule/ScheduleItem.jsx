import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatDate, getToday } from '../../utils/dateUtils';
import { addVaccination } from '../../api/vaccinations';
import ExportModal from '../export/ExportModal';
import { useAuth } from '../../context/AuthContext';

function ScheduleItem({ item, type, dogId, dogName, dogInfo, onVaccinationAdded }) {
  const { isPro } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const hasSafetyInfo = item.side_effects_common?.length > 0 || item.side_effects_seek_vet?.length > 0;
  const hasWarnings = !!item.warning;
  const hasExpandableContent = hasSafetyInfo || hasWarnings || item.description || item.notes;

  const getDaysText = () => {
    if (type === 'overdue') {
      const days = item.days_overdue;
      return `Past due: ${formatDate(item.date)} (${days} day${days !== 1 ? 's' : ''} overdue)`;
    }
    if (item.days_until === 0) {
      return `Due: ${formatDate(item.date)} (Due Today)`;
    }
    return `Due: ${formatDate(item.date)}`;
  };

  async function handleMarkAsDone(e) {
    e.stopPropagation();
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

  const toggleOpen = () => {
    if (hasExpandableContent) {
      setIsOpen(!isOpen);
    }
  };

  const infoAreaClass = item.contraindicated
    ? 'schedule-accordion__info-widget--contraindicated'
    : 'schedule-accordion__info-widget--caution';

  return (
    <div className={`schedule-accordion schedule-accordion--${type}`} data-tour="schedule-item">
      {/* Header row: vaccine name + warning icon + chevron */}
      <div
        className="schedule-accordion__header"
        onClick={toggleOpen}
        role={hasExpandableContent ? 'button' : undefined}
        aria-expanded={hasExpandableContent ? isOpen : undefined}
        tabIndex={hasExpandableContent ? 0 : undefined}
        onKeyDown={(e) => {
          if (hasExpandableContent && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            toggleOpen();
          }
        }}
      >
        <span className="schedule-accordion__vaccine-name">{item.vaccine}</span>

        <div className="schedule-accordion__header-right">
          {(item.contraindicated || item.warning) && (
            <span className={`schedule-accordion__warning-icon ${item.contraindicated ? 'schedule-accordion__warning-icon--danger' : 'schedule-accordion__warning-icon--caution'}`}>
              &#9888;
            </span>
          )}

          {hasExpandableContent && (
            <motion.img
              src="/Images/generic_icons/arrow_svg.svg"
              alt=""
              width="3"
              height="1"
              className="schedule-accordion__chevron icon"
              animate={{ rotate: isOpen ? 0 : 180 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </div>
      </div>

      {/* Expanded body */}
      <motion.div
        className="schedule-accordion__body"
        animate={{
          height: isOpen ? 'auto' : 0,
          opacity: isOpen ? 1 : 0,
        }}
        initial={false}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        style={{ overflow: 'hidden' }}
      >
        <div className="schedule-accordion__body-inner">

          {/* === Fluid tab info widget (warnings) === */}
          {hasWarnings ? (
            <div className={`schedule-accordion__info-widget ${infoAreaClass}`}>
              {/* Tabs row: fluid tab + other badges */}
              <div className="sa-info__tabs-row">
                {/* Fluid tab wrapping the status badge */}
                <div className="sa-info__fluid-tab">
                  {item.contraindicated ? (
                    <span className="schedule-accordion__badge schedule-accordion__badge--contraindicated">
                      <span>&#9888;</span>
                      <span>Contraindicated</span>
                    </span>
                  ) : (
                    <span className="schedule-accordion__badge schedule-accordion__badge--warning">
                      <span>&#9888;</span>
                      <span>Vet Consult Required</span>
                    </span>
                  )}
                </div>

                {/* Other badges sitting beside the tab */}
                <span className={`schedule-accordion__badge schedule-accordion__badge--date schedule-accordion__badge--${type}`}>
                  {getDaysText()}
                </span>

                <span className="schedule-accordion__badge schedule-accordion__badge--dose">
                  {item.dose}
                </span>
              </div>

              {/* Main body with warning text */}
              <div className="sa-info__main-body">
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
            </div>
          ) : (
            <div className="schedule-accordion__badges">
              <span className={`schedule-accordion__badge schedule-accordion__badge--date schedule-accordion__badge--${type}`}>
                {getDaysText()}
              </span>
              <span className="schedule-accordion__badge schedule-accordion__badge--dose">
                {item.dose}
              </span>
            </div>
          )}

          {/* Vaccine description */}
          {item.description && (
            <p className="schedule-accordion__description">{item.description}</p>
          )}

          {/* Common Side Effects */}
          {item.side_effects_common?.length > 0 && (
            <div className="schedule-accordion__safety schedule-accordion__safety--common">
              <h4>Common Side Effects ( Normal )</h4>
              <ul>
                {item.side_effects_common.map((effect, index) => (
                  <li key={index}>{effect}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Contact Vet warnings */}
          {item.side_effects_seek_vet?.length > 0 && (
            <div className="schedule-accordion__safety schedule-accordion__safety--warning">
              <h4>Contact your Veterinarian If:</h4>
              <ul>
                {item.side_effects_seek_vet.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Date range */}
          {item.date_range_start && item.date_range_end && item.date_range_start !== item.date_range_end && (
            <div className="schedule-accordion__date-range">
              Acceptable window: {formatDate(item.date_range_start)} - {formatDate(item.date_range_end)}
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <p className="schedule-accordion__notes">{item.notes}</p>
          )}

          {/* Action buttons */}
          <div className="schedule-accordion__actions">
            {isPro && (
              <button
                className="btn btn-sm btn-outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExportModalOpen(true);
                }}
                type="button"
              >
                Export <img src="/Images/generic_icons/export-icon.svg" alt="" width="14" height="14"
                style={{marginLeft:"5px"}}/>
              </button>
            )}
            {!item.contraindicated && (
              <button
                className="btn btn-sm btn-primary"
                onClick={handleMarkAsDone}
                disabled={isSubmitting}
                data-tour="mark-done-btn"
              >
                {isSubmitting ? 'Saving...' : <><span>Mark as Done</span> <img src="/Images/generic_icons/tick-circle.svg" alt="" width="14" height="14" 
              style={{marginLeft:"5px"}}/></>}
              </button>
            )}
          </div>
        </div>
      </motion.div>

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
