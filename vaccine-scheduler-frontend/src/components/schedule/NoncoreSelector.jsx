import { NONCORE_VACCINES } from '../../utils/constants';

// Vaccines recommended based on lifestyle/environment:
// - Social/travel dogs: Bordetella, Canine Influenza
// - Tick-exposed dogs: Lyme
const LIFESTYLE_VACCINES = ['noncore_bord_in', 'noncore_bord_inj', 'noncore_flu', 'noncore_lyme'];

function NoncoreSelector({ selected, onChange, recommendedIds = [] }) {
  return (
    <div className="noncore-selector" data-tour="noncore-selector">
      <h4>Optional Vaccines</h4>
      <p className="selector-hint">Select non-core vaccines to include in schedule</p>
      <div className="noncore-options">
        {NONCORE_VACCINES.map((vaccine) => {
          const isRecommended = recommendedIds.includes(vaccine.id);
          return (
            <label key={vaccine.id} className={`checkbox-label ${isRecommended ? 'checkbox-label--recommended' : ''}`}>
              <input
                type="checkbox"
                checked={selected.includes(vaccine.id)}
                onChange={() => onChange(vaccine.id)}
              />
              {vaccine.name}
              {isRecommended && <span className="recommended-badge">Recommended</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default NoncoreSelector;
