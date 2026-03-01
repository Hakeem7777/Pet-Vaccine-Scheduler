import client from './client';

export async function getBlogs(params = {}) {
  const response = await client.get('/blogs/', { params });
  return response.data;
}

export async function getBlogBySlug(slug) {
  const response = await client.get(`/blogs/${slug}/`);
  return response.data;
}
