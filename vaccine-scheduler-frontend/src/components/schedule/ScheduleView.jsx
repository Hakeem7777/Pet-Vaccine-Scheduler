import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { getSchedule } from '../../api/vaccines';
import NoncoreSelector from './NoncoreSelector';
import ScheduleCategory from './ScheduleCategory';
import LoadingSpinner from '../common/LoadingSpinner';
import ExportModal from '../export/ExportModal';

function ScheduleView({ dogId, dogName, dog, onScheduleLoad, onVaccinationAdded }) {
  const [schedule, setSchedule] = useState(null);
  const [dogInfo, setDogInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNoncore, setSelectedNoncore] = useState([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Auto-select lifestyle vaccines based on dog's environment
  useEffect(() => {
    if (dog) {
      const autoSelected = [];
      // Dogs that go to daycare, boarding, dog parks, or travel need Bordetella and Influenza
      if (dog.env_daycare_boarding || dog.env_dog_parks || dog.env_travel_shows) {
        autoSelected.push('noncore_bord_in'); // Intranasal Bordetella (most common)
        autoSelected.push('noncore_flu');     // Canine Influenza
      }
      // Dogs in tick-endemic areas (woods, tall grass) need Lyme vaccine
      if (dog.env_tick_exposure) {
        autoSelected.push('noncore_lyme');    // Lyme Disease
      }
      if (autoSelected.length > 0) {
        setSelectedNoncore(autoSelected);
      }
    }
  }, [dog]);

  useEffect(() => {
    fetchSchedule();
  }, [dogId, selectedNoncore]);

  async function fetchSchedule() {
    setIsLoading(true);
    try {
      const data = await getSchedule(dogId, selectedNoncore);
      setSchedule(data.schedule);
      setDogInfo(data.dog);
      setError(null);
      onScheduleLoad?.(selectedNoncore);
    } catch (err) {
      setError('Failed to load schedule.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleNoncoreChange(vaccineId) {
    setSelectedNoncore((prev) =>
      prev.includes(vaccineId)
        ? prev.filter((id) => id !== vaccineId)
        : [...prev, vaccineId]
    );
  }

  function handleVaccinationAdded() {
    fetchSchedule();
    onVaccinationAdded?.();
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
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setIsExportModalOpen(true)}
            data-tour="export-btn"
          >
            Export All
          </button>
        )}
      </div>

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        schedule={schedule}
        dogName={dogName}
        dogInfo={dogInfo}
      />

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

      {isLoading ? (
        <div className="schedule-loading">
          <LoadingSpinner size="small" />
        </div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : hasNoVaccines ? (
        <div className="schedule-empty">
          <p>All vaccinations are up to date!</p>
        </div>
      ) : (
        <motion.div
          className="schedule-categories"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          data-tour="schedule-categories"
        >
          <ScheduleCategory
            title="Overdue"
            items={schedule.overdue}
            type="overdue"
            dogId={dogId}
            dogName={dogName}
            dogInfo={dogInfo}
            onVaccinationAdded={handleVaccinationAdded}
          />
          <ScheduleCategory
            title="Upcoming (Next 30 Days)"
            items={schedule.upcoming}
            type="upcoming"
            dogId={dogId}
            dogName={dogName}
            dogInfo={dogInfo}
            onVaccinationAdded={handleVaccinationAdded}
          />
          <ScheduleCategory
            title="Future"
            items={schedule.future}
            type="future"
            dogId={dogId}
            dogName={dogName}
            dogInfo={dogInfo}
            onVaccinationAdded={handleVaccinationAdded}
          />
        </motion.div>
      )}

      <div className="important-notice">
        <h4>Important Notice</h4>
        <p>
          Vaccine schedules are generated based on AAHA (American Animal Hospital Association)
          and WSAVA (World Small Animal Veterinary Association) guidelines. This information
          is provided for educational purposes only and does not constitute veterinary advice.
          Always consult with a licensed veterinarian for decisions about your dog's health
          and vaccination schedule.
        </p>
      </div>
    </div>
  );
}

export default ScheduleView;
