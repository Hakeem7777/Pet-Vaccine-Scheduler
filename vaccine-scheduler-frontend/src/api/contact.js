import client from './client';

/**
 * Submit contact form
 * @param {Object} data - Contact form data
 * @param {string} data.name - Full name
 * @param {string} data.email - Email address
 * @param {string} data.subject - Subject line
 * @param {string} data.message - Message content
 * @returns {Promise} API response
 */
export async function submitContactForm(data) {
  const response = await client.post('/email/contact/', data);
  return response.data;
}
