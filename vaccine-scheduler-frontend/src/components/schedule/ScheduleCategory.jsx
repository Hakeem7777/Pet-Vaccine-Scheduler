import ScheduleItem from './ScheduleItem';

function ScheduleCategory({ title, items, type, dogId, dogName, dogInfo, onVaccinationAdded, markFirstAsTourTarget = false }) {
  if (!items || items.length === 0) {
    return null;
  }

  // Find the first non-contraindicated item index for the tour target,
  // since contraindicated items don't have a "Mark as Done" button
  const tourTargetIndex = markFirstAsTourTarget
    ? items.findIndex(item => !item.contraindicated)
    : -1;

  return (
    <div className={`schedule-category schedule-category--${type}`}>
      <h4 className="schedule-category-title">
        {title} ({items.length})
      </h4>
      <div className="schedule-category-items">
        {items.map((item, index) => (
          <ScheduleItem
            key={`${item.vaccine}-${item.dose}-${index}`}
            item={item}
            type={type}
            dogId={dogId}
            dogName={dogName}
            dogInfo={dogInfo}
            onVaccinationAdded={onVaccinationAdded}
            isTourTarget={index === tourTargetIndex}
          />
        ))}
      </div>
    </div>
  );
}

export default ScheduleCategory;
