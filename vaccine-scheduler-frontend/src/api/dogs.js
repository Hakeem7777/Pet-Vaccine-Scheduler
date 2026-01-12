import client from './client';

export async function getDogs() {
  const response = await client.get('/dogs/');
  return response.data;
}

export async function getDog(id) {
  const response = await client.get(`/dogs/${id}/`);
  return response.data;
}

export async function createDog(data) {
  const response = await client.post('/dogs/', data);
  return response.data;
}

export async function updateDog(id, data) {
  const response = await client.put(`/dogs/${id}/`, data);
  return response.data;
}

export async function deleteDog(id) {
  await client.delete(`/dogs/${id}/`);
}

export async function extractFromDocument(dogId, file) {
  const formData = new FormData();
  formData.append('document', file);

  const response = await client.post(
    `/dogs/${dogId}/extract-document/`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}

export async function applyExtraction(dogId, extractionData) {
  const response = await client.post(
    `/dogs/${dogId}/apply-extraction/`,
    extractionData
  );
  return response.data;
}

export async function extractFromDocumentNew(file) {
  const formData = new FormData();
  formData.append('document', file);

  const response = await client.post(
    '/ai/extract-document-new/',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}

export async function createDogFromExtraction(extractionData, additionalData) {
  // Merge extracted data with user-provided data
  const dogData = {
    ...extractionData.dog_info,
    ...additionalData,
  };

  // Handle lifestyle data
  if (extractionData.lifestyle) {
    Object.assign(dogData, extractionData.lifestyle);
  }

  const response = await client.post('/dogs/', dogData);
  return {
    dog: response.data,
    vaccinations: extractionData.vaccinations || [],
  };
}
