import client from './client';

export async function getDashboardStats() {
  const response = await client.get('/dashboard/');
  return response.data;
}
