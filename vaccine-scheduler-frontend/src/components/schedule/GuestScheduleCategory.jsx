import GuestScheduleItem from './GuestScheduleItem';

function GuestScheduleCategory({ title, items, type, dogName, onVaccinationAdded }) {
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
          <GuestScheduleItem
            key={`${item.vaccine}-${item.dose}-${index}`}
            item={item}
            type={type}
            dogName={dogName}
            onVaccinationAdded={onVaccinationAdded}
          />
        ))}
      </div>
    </div>
  );
}

export default GuestScheduleCategory;
