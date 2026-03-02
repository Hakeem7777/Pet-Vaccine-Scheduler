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

export async function redeemPromoCode(code) {
  const response = await client.post('/subscriptions/redeem-promo/', { code });
  return response.data;
}

export async function recordPdfExport() {
  const response = await client.post('/subscriptions/pdf-export/record/');
  return response.data;
}
