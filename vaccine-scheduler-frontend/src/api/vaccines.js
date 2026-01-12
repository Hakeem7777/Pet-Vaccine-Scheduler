import client from './client';

export async function getVaccines() {
  const response = await client.get('/vaccines/');
  return response.data;
}

export async function getVaccine(id) {
  const response = await client.get(`/vaccines/${id}/`);
  return response.data;
}

export async function getSchedule(dogId, selectedNoncore = [], referenceDate = null) {
  const data = {
    selected_noncore: selectedNoncore,
  };
  if (referenceDate) {
    data.reference_date = referenceDate;
  }
  const response = await client.post(`/dogs/${dogId}/schedule/`, data);
  return response.data;
}

export async function getHistoryAnalysis(dogId) {
  const response = await client.get(`/dogs/${dogId}/schedule/history-analysis/`);
  return response.data;
}
