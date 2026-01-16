import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import useGuestStore from '../../store/useGuestStore';
import { calculateGuestSchedule } from '../../utils/guestScheduler';
import NoncoreSelector from './NoncoreSelector';
import GuestScheduleCategory from './GuestScheduleCategory';
import ExportDropdown from '../export/ExportDropdown';

function GuestScheduleView({ dog, onVaccinationAdded }) {
  const { vaccinations } = useGuestStore();
  const [selectedNoncore, setSelectedNoncore] = useState([]);

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

  function handleNoncoreChange(vaccineId) {
    setSelectedNoncore((prev) =>
      prev.includes(vaccineId)
        ? prev.filter((id) => id !== vaccineId)
        : [...prev, vaccineId]
    );
  }

  const hasNoVaccines =
    schedule &&
    schedule.overdue.length === 0 &&
    schedule.upcoming.length === 0 &&
    schedule.future.length === 0;

  const hasVaccines = schedule && !hasNoVaccines;

  return (
    <div className="schedule-view">
      <div className="schedule-view__header">
        <h3>Vaccination Schedule</h3>
        {hasVaccines && (
          <ExportDropdown
            schedule={schedule}
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

      {hasNoVaccines ? (
        <div className="schedule-empty">
          <p>All vaccinations are up to date!</p>
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
            items={schedule.overdue}
            type="overdue"
            dogName={dog.name}
            dogInfo={dog}
            onVaccinationAdded={onVaccinationAdded}
          />
          <GuestScheduleCategory
            title="Upcoming (Next 30 Days)"
            items={schedule.upcoming}
            type="upcoming"
            dogName={dog.name}
            dogInfo={dog}
            onVaccinationAdded={onVaccinationAdded}
          />
          <GuestScheduleCategory
            title="Future"
            items={schedule.future}
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
