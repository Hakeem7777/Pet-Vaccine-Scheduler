import ScheduleItem from './ScheduleItem';

function ScheduleCategory({ title, items, type, dogId, dogName, dogInfo, onVaccinationAdded }) {
  if (!items || items.length === 0) {
    return null;
  }

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
          />
        ))}
      </div>
    </div>
  );
}

export default ScheduleCategory;
