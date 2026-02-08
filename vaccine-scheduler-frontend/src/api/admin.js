import client from './client';

export async function getAdminStats() {
  const response = await client.get('/admin-panel/stats/');
  return response.data;
}

export async function getAdminUsers(params = {}) {
  const response = await client.get('/admin-panel/users/', { params });
  return response.data;
}

export async function deleteAdminUser(id) {
  await client.delete(`/admin-panel/users/${id}/`);
}

export async function getAdminDogs(params = {}) {
  const response = await client.get('/admin-panel/dogs/', { params });
  return response.data;
}

export async function deleteAdminDog(id) {
  await client.delete(`/admin-panel/dogs/${id}/`);
}

export async function getAdminVaccinations(params = {}) {
  const response = await client.get('/admin-panel/vaccinations/', { params });
  return response.data;
}

export async function getAdminContacts(params = {}) {
  const response = await client.get('/admin-panel/contacts/', { params });
  return response.data;
}

export async function replyToContact(id, replyMessage) {
  const response = await client.post(`/admin-panel/contacts/${id}/reply/`, {
    reply_message: replyMessage,
  });
  return response.data;
}
