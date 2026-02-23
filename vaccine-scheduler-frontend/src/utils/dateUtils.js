export function formatDogAge(birthDateStr) {
  if (!birthDateStr) return '';
  const birth = new Date(birthDateStr);
  const today = new Date();

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];
  if (years > 0) parts.push(`${years}yr`);
  if (months > 0) parts.push(`${months}m`);
  if (days > 0 || parts.length === 0) parts.push(`${days}d`);

  return parts.join(' ');
}

export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateInput(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

export function getToday() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Group schedule items by date for calendar display
 * Returns: { "2025-01-15": [{ ...item, type: "overdue" }], ... }
 */
export function groupScheduleByDate(schedule) {
  const grouped = {};

  ['overdue', 'upcoming', 'future'].forEach((type) => {
    if (schedule[type]) {
      schedule[type].forEach((item) => {
        const dateKey = item.date;
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push({ ...item, type });
      });
    }
  });

  return grouped;
}

/**
 * Get all unique dates from a schedule as Date objects
 */
export function getScheduleDates(schedule) {
  const dates = new Set();

  ['overdue', 'upcoming', 'future'].forEach((type) => {
    if (schedule[type]) {
      schedule[type].forEach((item) => {
        dates.add(item.date);
      });
    }
  });

  return [...dates];
}

/**
 * Get dates by category for calendar modifiers
 */
export function getDatesByCategory(schedule) {
  return {
    overdue: (schedule.overdue || []).map((item) => new Date(item.date)),
    upcoming: (schedule.upcoming || []).map((item) => new Date(item.date)),
    future: (schedule.future || []).map((item) => new Date(item.date)),
  };
}

/**
 * Convert date to ISO string (YYYY-MM-DD) in local timezone
 */
export function toDateString(date) {
  if (!date) return null;
  if (typeof date === 'string') return date.split('T')[0];
  // Use local date components to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
