import client from './client';

export async function getVaccinations(dogId) {
  const response = await client.get(`/dogs/${dogId}/vaccinations/`);
  return response.data;
}

export async function addVaccination(dogId, data) {
  const response = await client.post(`/dogs/${dogId}/vaccinations/`, data);
  return response.data;
}

export async function updateVaccination(dogId, vaccinationId, data) {
  const response = await client.put(`/dogs/${dogId}/vaccinations/${vaccinationId}/`, data);
  return response.data;
}

export async function deleteVaccination(dogId, vaccinationId) {
  await client.delete(`/dogs/${dogId}/vaccinations/${vaccinationId}/`);
}
