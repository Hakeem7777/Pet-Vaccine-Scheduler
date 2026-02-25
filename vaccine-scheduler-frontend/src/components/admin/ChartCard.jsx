import { useState, useEffect, useRef } from 'react';
import { computeDateWindow, formatWindowLabel } from '../../utils/chartDateUtils';

const TIME_RANGE_OPTIONS = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '6m', label: '6M' },
  { value: '12m', label: '12M' },
  { value: 'all', label: 'All' },
];

const GRANULARITY_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Wk' },
  { value: 'month', label: 'Mo' },
];

export default function ChartCard({
  chartKey,
  showGranularity = false,
  showNavigation = false,
  onFilterChange,
  loading = false,
  defaultRange = '12m',
  children,
}) {
  const [range, setRange] = useState(defaultRange);
  const [granularity, setGranularity] = useState('auto');
  const [offset, setOffset] = useState(0);
  // Only fire API calls after a user-initiated change, not on mount
  const userChanged = useRef(false);

  useEffect(() => {
    if (!userChanged.current) return;
    userChanged.current = false;
    const { date_from, date_to } = computeDateWindow(range, offset);
    onFilterChange(chartKey, { range, granularity, date_from, date_to, offset });
  }, [range, granularity, offset, chartKey, onFilterChange]);

  function handleRangeChange(newRange) {
    userChanged.current = true;
    setRange(newRange);
    setOffset(0);
  }

  function handleGranularityChange(newGran) {
    userChanged.current = true;
    setGranularity(newGran);
  }

  function handlePrev() {
    userChanged.current = true;
    setOffset((prev) => prev - 1);
  }

  function handleNext() {
    if (offset < 0) {
      userChanged.current = true;
      setOffset((prev) => prev + 1);
    }
  }

  const canNavigate = showNavigation && range !== 'all';
  const canGoNext = offset < 0;
  const windowLabel = formatWindowLabel(range, offset);

  return (
    <div className="chart-card-wrapper">
      <div className="chart-card__filter-bar">
        <div className="chart-card__filters">
          <div className="chart-card__range-pills">
            {TIME_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`chart-card__pill${range === opt.value ? ' chart-card__pill--active' : ''}`}
                onClick={() => handleRangeChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {showGranularity && (
            <div className="chart-card__gran-pills">
              {GRANULARITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`chart-card__pill chart-card__pill--gran${granularity === opt.value ? ' chart-card__pill--active' : ''}`}
                  onClick={() => handleGranularityChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {canNavigate && (
          <div className="chart-card__nav">
            <button className="chart-card__nav-btn" onClick={handlePrev} title="Previous period">
              &#8249;
            </button>
            {windowLabel && <span className="chart-card__nav-label">{windowLabel}</span>}
            <button
              className="chart-card__nav-btn"
              onClick={handleNext}
              disabled={!canGoNext}
              title="Next period"
            >
              &#8250;
            </button>
          </div>
        )}
      </div>

      <div className={loading ? 'chart-card__body chart-card__body--loading' : 'chart-card__body'}>
        {children}
      </div>
    </div>
  );
}
