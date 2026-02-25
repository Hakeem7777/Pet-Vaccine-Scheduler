import client from './client';

export async function getDashboardStats() {
  const response = await client.get('/dashboard/');
  return response.data;
}

export async function getReminderPreferences() {
  const response = await client.get('/dashboard/reminders/');
  return response.data;
}

export async function updateReminderPreferences(data) {
  const response = await client.put('/dashboard/reminders/', data);
  return response.data;
}

export async function captureLeadEmail(email, source = 'guest_schedule') {
  const response = await client.post('/leads/capture/', { email, source });
  return response.data;
}
