import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import { AGE_CLASSIFICATIONS } from '../../utils/constants';

function DogCard({ dog }) {
  const navigate = useNavigate();

  // Don't render if dog data is missing
  if (!dog || !dog.name) {
    return null;
  }

  // Check if this is an optimistic (pending) dog
  const isOptimistic = dog._isOptimistic;

  function handleClick() {
    // Don't navigate for optimistic entries (they don't exist on server yet)
    if (isOptimistic) return;
    navigate(`/dogs/${dog.id}`);
  }

  const ageClassification = dog.age_classification || 'unknown';
  const ageWeeks = dog.age_weeks ?? 0;
  const vaccinationCount = dog.vaccination_count ?? 0;

  return (
    <Card
      className={`dog-card ${isOptimistic ? 'dog-card--optimistic' : ''}`}
      onClick={handleClick}
    >
      <div className="dog-card-header">
        <h3 className="dog-name">{dog.name}</h3>
        <span className={`age-badge age-${ageClassification}`}>
          {AGE_CLASSIFICATIONS[ageClassification] || ageClassification}
        </span>
      </div>
      <div className="dog-card-body">
        {dog.breed && <p className="dog-breed">{dog.breed}</p>}
        <p className="dog-age">{ageWeeks} weeks old</p>
        {dog.sex_display && <p className="dog-sex">{dog.sex_display}</p>}
      </div>
      <div className="dog-card-footer">
        <span className="vaccination-count">
          {vaccinationCount} vaccination{vaccinationCount !== 1 ? 's' : ''}
        </span>
        {isOptimistic && <span className="dog-card-saving">Saving...</span>}
      </div>
    </Card>
  );
}

export default DogCard;
