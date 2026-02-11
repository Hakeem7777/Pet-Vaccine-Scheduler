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

export async function toggleAdminUserActive(id) {
  const response = await client.patch(`/admin-panel/users/${id}/toggle-active/`);
  return response.data;
}

export async function exportAdminUsersCSV(params = {}) {
  const response = await client.get('/admin-panel/users/export/', {
    params,
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'users_export.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
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

export async function getAdminGraphData() {
  const response = await client.get('/admin-panel/graphs/');
  return response.data;
}

export async function getAdminTokenUsage(params = {}) {
  const response = await client.get('/admin-panel/token-usage/', { params });
  return response.data;
}

export async function getAdminTokenUsageStats() {
  const response = await client.get('/admin-panel/token-usage/stats/');
  return response.data;
}

export async function sendAdminAIQuery(message, conversationHistory = [], model = null) {
  const body = {
    message,
    conversation_history: conversationHistory,
  };
  if (model) body.model = model;
  const response = await client.post('/admin-panel/ai-analytics/', body);
  return response.data;
}

export async function getAdminAIModels() {
  const response = await client.get('/admin-panel/ai-models/');
  return response.data;
}
