import client from './client';

/**
 * Send vaccination schedule via email
 * @param {Object} data - Email data
 * @param {string[]} data.emails - Array of email addresses to send to
 * @param {string} data.dogName - Name of the dog
 * @param {Object} data.dogInfo - Dog information (breed, age, etc.)
 * @param {Object} data.schedule - Vaccination schedule with overdue, upcoming, future arrays
 * @param {string} data.historyAnalysis - AI analysis of vaccination history
 * @returns {Promise} API response
 */
export async function sendScheduleEmail(data) {
  const response = await client.post('/email/send-schedule/', data);
  return response.data;
}
