import { createEvents } from 'ics';

/**
 * Format date for Google Calendar URL (YYYYMMDD format for all-day events)
 */
function formatGoogleDate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Parse date string to array format for ics library [year, month, day]
 */
function parseDateToArray(dateString) {
  const date = new Date(dateString);
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
}

/**
 * Generate a unique ID for calendar events
 */
function generateUID(item, dogName) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${item.vaccine_id}-${timestamp}-${random}@vaccine-scheduler`;
}

/**
 * Generate Google Calendar URL for a single vaccine event
 */
export function generateGoogleCalendarUrl(item, dogName) {
  const baseUrl = 'https://calendar.google.com/calendar/r/eventedit';
  const title = `${item.vaccine} Vaccination - ${dogName}`;
  const details = `Dose: ${item.dose}${item.notes ? `\nNotes: ${item.notes}` : ''}`;
  const dateStr = formatGoogleDate(item.date);

  const params = new URLSearchParams({
    text: title,
    dates: `${dateStr}/${dateStr}`,
    details: details,
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Export a single vaccine to .ics file
 */
export function exportSingleToICS(item, dogName) {
  const event = {
    start: parseDateToArray(item.date),
    end: parseDateToArray(item.date),
    title: `${item.vaccine} Vaccination - ${dogName}`,
    description: `Dose: ${item.dose}${item.notes ? `\nNotes: ${item.notes}` : ''}`,
    uid: generateUID(item, dogName),
    calName: 'Vaccine Schedule',
  };

  createEvents([event], (error, value) => {
    if (error) {
      console.error('Failed to create ICS file:', error);
      alert('Failed to export calendar event. Please try again.');
      return;
    }

    downloadICSFile(value, `${dogName}-${item.vaccine}-vaccination.ics`);
  });
}

/**
 * Export all scheduled vaccines to a single .ics file
 */
export function exportAllToICS(schedule, dogName) {
  const allItems = [
    ...schedule.overdue,
    ...schedule.upcoming,
    ...schedule.future,
  ];

  if (allItems.length === 0) {
    alert('No vaccines to export.');
    return;
  }

  const events = allItems.map((item) => ({
    start: parseDateToArray(item.date),
    end: parseDateToArray(item.date),
    title: `${item.vaccine} Vaccination - ${dogName}`,
    description: `Dose: ${item.dose}${item.notes ? `\nNotes: ${item.notes}` : ''}`,
    uid: generateUID(item, dogName),
    calName: 'Vaccine Schedule',
  }));

  createEvents(events, (error, value) => {
    if (error) {
      console.error('Failed to create ICS file:', error);
      alert('Failed to export calendar events. Please try again.');
      return;
    }

    downloadICSFile(value, `${dogName}-vaccine-schedule.ics`);
  });
}

/**
 * Helper to download ICS content as a file
 */
function downloadICSFile(content, filename) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export to Google Calendar by downloading ICS file and opening the import page
 */
export function exportToGoogleCalendar(schedule, dogName) {
  const allItems = [
    ...schedule.overdue,
    ...schedule.upcoming,
    ...schedule.future,
  ];

  if (allItems.length === 0) {
    alert('No vaccines to export.');
    return;
  }

  const events = allItems.map((item) => ({
    start: parseDateToArray(item.date),
    end: parseDateToArray(item.date),
    title: `${item.vaccine} Vaccination - ${dogName}`,
    description: `Dose: ${item.dose}${item.notes ? `\nNotes: ${item.notes}` : ''}`,
    uid: generateUID(item, dogName),
    calName: 'Vaccine Schedule',
  }));

  createEvents(events, (error, value) => {
    if (error) {
      console.error('Failed to create ICS file:', error);
      alert('Failed to export calendar events. Please try again.');
      return;
    }

    // Download the ICS file first
    downloadICSFile(value, `${dogName}-vaccine-schedule.ics`);

    // Then open Google Calendar import page after a short delay
    setTimeout(() => {
      window.open('https://calendar.google.com/calendar/u/0/r/settings/export', '_blank');
    }, 500);
  });
}
