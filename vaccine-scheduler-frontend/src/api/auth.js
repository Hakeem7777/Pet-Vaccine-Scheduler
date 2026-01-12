import client from './client';

export async function login(username, password) {
  const response = await client.post('/auth/login/', { username, password });
  return response.data;
}

export async function register(data) {
  const response = await client.post('/auth/register/', data);
  return response.data;
}

export async function refreshToken(refresh) {
  const response = await client.post('/auth/refresh/', { refresh });
  return response.data;
}

export async function getProfile() {
  const response = await client.get('/auth/me/');
  return response.data;
}

export async function updateProfile(data) {
  const response = await client.put('/auth/me/', data);
  return response.data;
}

export async function changePassword(data) {
  const response = await client.post('/auth/password/change/', data);
  return response.data;
}

export async function logout(refresh) {
  const response = await client.post('/auth/logout/', { refresh });
  return response.data;
}
