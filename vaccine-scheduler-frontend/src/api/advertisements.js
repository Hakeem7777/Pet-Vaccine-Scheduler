import client from './client';

export async function getActiveAds() {
  const response = await client.get('/advertisements/active/');
  return response.data;
}
