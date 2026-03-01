import client from './client';

export async function getPlans() {
  const response = await client.get('/subscriptions/plans/');
  return response.data;
}

export async function getSubscriptionStatus() {
  const response = await client.get('/subscriptions/status/');
  return response.data;
}

export async function createSubscription(data) {
  const response = await client.post('/subscriptions/create/', data);
  return response.data;
}

export async function cancelSubscription(reason) {
  const response = await client.post('/subscriptions/cancel/', { reason });
  return response.data;
}
