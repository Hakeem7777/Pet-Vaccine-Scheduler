import { useNavigate } from 'react-router-dom';
import { AGE_CLASSIFICATIONS } from '../../utils/constants';
import { formatDogAge } from '../../utils/dateUtils';
import { getDogImageUrl } from '../../utils/breedImageUtils';

function formatBadgeDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '\u2026';
}

function DogCard({ dog }) {
  const navigate = useNavigate();

  if (!dog || !dog.name) return null;

  const isOptimistic = dog._isOptimistic;
  const imageUrl = getDogImageUrl(dog);
  const ageClassification = dog.age_classification || 'unknown';
  const vaccinationSummary = dog.vaccination_summary || {};
  const progressPercent = vaccinationSummary.progress_percent ?? 0;
  const overdueVaccines = vaccinationSummary.overdue || [];

  function handleClick() {
    if (isOptimistic) return;
    navigate(`/dogs/${dog.id}`);
  }

  return (
    <div
      className={`dog-card-v2 ${isOptimistic ? 'dog-card-v2--optimistic' : ''}`}
      onClick={handleClick}
    >
      <div className="dog-card-v2__image-wrapper">
        <img
          src={imageUrl}
          alt={dog.name}
          className="dog-card-v2__image"
          onError={(e) => { e.target.src = '/Images/dog_icon.svg'; }}
        />
      </div>

      <div className="dog-card-v2__body">
        <div className="dog-card-v2__name-row">
          <h3 className="dog-card-v2__name">{dog.name}</h3>
          {overdueVaccines.length > 0 && (
            <span className="dog-card-v2__overdue-badge">
              {truncate(overdueVaccines[0].vaccine, 14)}
              <span className="dog-card-v2__overdue-due">
                {'\u26A0'} Due: {formatBadgeDate(overdueVaccines[0].due_date)}
              </span>
            </span>
          )}
        </div>

        <p className="dog-card-v2__breed">
          {dog.breed || 'Unknown breed'}
          <span className="dog-card-v2__dot">{' \u2022 '}</span>
          {AGE_CLASSIFICATIONS[ageClassification] || ageClassification}
        </p>

        <div className="dog-card-v2__info-row">
          <span className="dog-card-v2__detail">
            Age: <span className="dog-card-v2__detail-value">{formatDogAge(dog.birth_date)}</span>
          </span>
          <span className="dog-card-v2__detail">
            Gender: <span className="dog-card-v2__detail-value">{dog.sex_display || '\u2014'}</span>
          </span>
        </div>

        <div className="dog-card-v2__vaccination-status">
          <div className="dog-card-v2__status-header">
            <span>Vaccination Status</span>
            <span className="dog-card-v2__status-percent">{progressPercent}%</span>
          </div>
          <div className="dog-card-v2__progress-bar">
            <div
              className="dog-card-v2__progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {isOptimistic && <span className="dog-card-v2__saving">Saving...</span>}
      </div>
    </div>
  );
}

export default DogCard;
