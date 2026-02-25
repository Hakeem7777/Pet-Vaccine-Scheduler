const RANGE_MS = {
  '7d':  7  * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
  '6m':  182 * 24 * 60 * 60 * 1000,
  '12m': 365 * 24 * 60 * 60 * 1000,
};

function toISODate(d) {
  return d.toISOString().split('T')[0];
}

/**
 * Compute date_from and date_to for a given range and navigation offset.
 * offset=0  → window ends at "now"
 * offset=-1 → window ends one window-size ago (showing previous period)
 *
 * @returns {{ date_from: string|null, date_to: string|null }}
 */
export function computeDateWindow(range, offset = 0) {
  if (range === 'all') return { date_from: null, date_to: null };

  const windowMs = RANGE_MS[range];
  if (!windowMs) return { date_from: null, date_to: null };

  const now = new Date();
  const windowEnd = new Date(now.getTime() + offset * windowMs);
  const windowStart = new Date(windowEnd.getTime() - windowMs);

  return {
    date_from: toISODate(windowStart),
    date_to: offset === 0 ? null : toISODate(windowEnd),
  };
}

/**
 * Format a human-readable label for the current navigation window.
 * Returns null when at the latest window (offset=0) or range=all.
 */
export function formatWindowLabel(range, offset) {
  if (range === 'all' || offset === 0) return null;

  const { date_from, date_to } = computeDateWindow(range, offset);
  if (!date_from) return null;

  const from = new Date(date_from + 'T00:00:00');
  const to = date_to ? new Date(date_to + 'T00:00:00') : new Date();

  const fromStr = from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const toStr = to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return `${fromStr} – ${toStr}`;
}
