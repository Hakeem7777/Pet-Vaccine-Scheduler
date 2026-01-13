import client from './client';

export async function getAIStatus() {
  const response = await client.get('/ai/status/');
  return response.data;
}

export async function queryAI(query) {
  const response = await client.post('/ai/query/', { query });
  return response.data;
}

export async function getDogAIAnalysis(dogId, options = {}) {
  const data = {
    include_schedule: options.includeSchedule !== false,
    selected_noncore: options.selectedNoncore || [],
    custom_query: options.customQuery || '',
  };
  const response = await client.post(`/dogs/${dogId}/ai-analysis/`, data);
  return response.data;
}

export async function sendChatMessage(message, dogId = null, dogIds = null, conversationHistory = [], selectedNoncore = []) {
  console.log('sendChatMessage - selectedNoncore:', selectedNoncore);
  const data = {
    message,
    conversation_history: conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    selected_noncore: selectedNoncore,
  };

  // Support multi-dog context (dog_ids takes precedence)
  if (dogIds && dogIds.length > 0) {
    data.dog_ids = dogIds;
  } else if (dogId) {
    data.dog_id = dogId;
  }

  const response = await client.post('/ai/chat/', data);
  return response.data;
}
