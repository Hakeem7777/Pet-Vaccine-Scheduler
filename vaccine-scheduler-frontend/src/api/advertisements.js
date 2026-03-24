import client from './client';

export async function getActiveAds() {
  const response = await client.get('/advertisements/active/');
  return response.data;
}

export async function trackAdClick(adId) {
  try {
    await client.post(`/advertisements/${adId}/click/`);
  } catch {
    // silently fail - don't disrupt user experience for analytics
  }
}
