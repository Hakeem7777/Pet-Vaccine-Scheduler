import client from './client';

export async function getHelpVideos(params = {}) {
  const response = await client.get('/help-videos/', { params });
  return response.data;
}

export async function getHelpVideoBySlug(slug) {
  const response = await client.get(`/help-videos/${slug}/`);
  return response.data;
}
