import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import useGuestStore from '../../store/useGuestStore';
import { calculateGuestSchedule } from '../../utils/guestScheduler';
import NoncoreSelector from './NoncoreSelector';
import GuestScheduleCategory from './GuestScheduleCategory';
import ExportDropdown from '../export/ExportDropdown';
import EmailCaptureGate from './EmailCaptureGate';

function GuestScheduleView({ dog, onVaccinationAdded }) {
  const { vaccinations, capturedEmail } = useGuestStore();
  const [selectedNoncore, setSelectedNoncore] = useState([]);
  const [hideContraindicated, setHideContraindicated] = useState(false);
  const [emailUnlocked, setEmailUnlocked] = useState(!!capturedEmail);

  // Auto-select lifestyle vaccines based on dog's environment
  useEffect(() => {
    if (dog) {
      const autoSelected = [];
      if (dog.env_daycare_boarding || dog.env_dog_parks || dog.env_travel_shows) {
        autoSelected.push('noncore_bord_in');
        autoSelected.push('noncore_flu');
      }
      if (dog.env_tick_exposure) {
        autoSelected.push('noncore_lyme');
      }
      if (autoSelected.length > 0) {
        setSelectedNoncore(autoSelected);
      }
    }
  }, [dog]);

  // Calculate schedule locally
  const scheduleData = useMemo(() => {
    if (!dog) return null;
    return calculateGuestSchedule(dog, selectedNoncore, vaccinations);
  }, [dog, selectedNoncore, vaccinations]);

  const schedule = scheduleData?.schedule;
  const historyAnalysis = scheduleData?.history_analysis;

  const hasContraindicated = useMemo(() => {
    if (!schedule) return false;
    return [...schedule.overdue, ...schedule.upcoming, ...schedule.future]
      .some(item => item.contraindicated);
  }, [schedule]);

  const filteredSchedule = useMemo(() => {
    if (!schedule || !hideContraindicated) return schedule;
    return {
      overdue: schedule.overdue.filter(item => !item.contraindicated),
      upcoming: schedule.upcoming.filter(item => !item.contraindicated),
      future: schedule.future.filter(item => !item.contraindicated),
    };
  }, [schedule, hideContraindicated]);

  function handleNoncoreChange(vaccineId) {
    setSelectedNoncore((prev) =>
      prev.includes(vaccineId)
        ? prev.filter((id) => id !== vaccineId)
        : [...prev, vaccineId]
    );
  }

  const hasNoVaccines =
    filteredSchedule &&
    filteredSchedule.overdue.length === 0 &&
    filteredSchedule.upcoming.length === 0 &&
    filteredSchedule.future.length === 0;

  const hasVaccines = filteredSchedule && !hasNoVaccines;

  // Show email gate for guest users who haven't provided email yet
  if (!emailUnlocked) {
    return (
      <div className="schedule-view">
        <div className="schedule-view__header">
          <h3>Vaccination Schedule</h3>
        </div>
        <EmailCaptureGate onUnlock={() => setEmailUnlocked(true)} />
      </div>
    );
  }

  return (
    <div className="schedule-view">
      <div className="schedule-view__header">
        <h3>Vaccination Schedule</h3>
        {hasVaccines && (
          <ExportDropdown
            schedule={filteredSchedule}
            dogName={dog.name}
            dogInfo={dog}
            historyAnalysis={historyAnalysis}
          />
        )}
      </div>

      <NoncoreSelector
        selected={selectedNoncore}
        onChange={handleNoncoreChange}
        recommendedIds={dog ? [
          ...(dog.env_daycare_boarding || dog.env_dog_parks || dog.env_travel_shows
            ? ['noncore_bord_in', 'noncore_flu']
            : []),
          ...(dog.env_tick_exposure ? ['noncore_lyme'] : [])
        ] : []}
      />

      {dog && (dog.health_vaccine_reaction === 'yes' ||
               dog.health_immune_condition === 'yes' ||
               dog.health_immunosuppressive_meds === 'yes' ||
               dog.health_pregnant_breeding === 'yes' ||
               dog.medical_conditions?.length > 0) && (
        <div className="health-alert-banner">
          <div className="schedule-item-warning schedule-item-warning--caution">
            <p className="schedule-warning-text">
              <strong>Health Screening Alert:</strong> Based on your health screening answers
              {dog.medical_conditions?.length > 0 && ' and reported medical conditions'}
              , some vaccines below have been flagged with warnings or contraindications.
              Look for warning badges on individual vaccines. Always consult your veterinarian
              before making vaccination decisions.
            </p>
          </div>
        </div>
      )}

      {hasContraindicated && (
        <div className="contraindication-filter">
          <label className="contraindication-filter__label">
            <input
              type="checkbox"
              checked={hideContraindicated}
              onChange={(e) => setHideContraindicated(e.target.checked)}
            />
            Hide contraindicated vaccines
          </label>
        </div>
      )}

      {hasNoVaccines ? (
        <div className="schedule-empty">
          <p>
            {hideContraindicated && schedule && (schedule.overdue.length > 0 || schedule.upcoming.length > 0 || schedule.future.length > 0)
              ? 'All remaining vaccines are contraindicated. Uncheck the filter above to see them.'
              : 'All vaccinations are up to date!'}
          </p>
        </div>
      ) : (
        <motion.div
          className="schedule-categories"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <GuestScheduleCategory
            title="Overdue"
            items={filteredSchedule.overdue}
            type="overdue"
            dogName={dog.name}
            dogInfo={dog}
            onVaccinationAdded={onVaccinationAdded}
          />
          <GuestScheduleCategory
            title="Upcoming (Next 30 Days)"
            items={filteredSchedule.upcoming}
            type="upcoming"
            dogName={dog.name}
            dogInfo={dog}
            onVaccinationAdded={onVaccinationAdded}
          />
          <GuestScheduleCategory
            title="Future"
            items={filteredSchedule.future}
            type="future"
            dogName={dog.name}
            dogInfo={dog}
            onVaccinationAdded={onVaccinationAdded}
          />
        </motion.div>
      )}

      {historyAnalysis && (
        <div className="history-analysis">
          <h4>Schedule Info</h4>
          <p>{historyAnalysis}</p>
        </div>
      )}
    </div>
  );
}

export default GuestScheduleView;
