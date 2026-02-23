import client from './client';

export async function login(email, password) {
  const response = await client.post('/auth/login/', { email, password });
  return response.data;
}

export async function register(data) {
  const response = await client.post('/auth/register/', data);
  return response.data;
}

export async function verifyOTP(email, otp) {
  const response = await client.post('/auth/verify-otp/', { email, otp });
  return response.data;
}

export async function resendOTP(email) {
  const response = await client.post('/auth/resend-otp/', { email });
  return response.data;
}

export async function refreshToken() {
  // Cookie is sent automatically — no body needed
  const response = await client.post('/auth/refresh/');
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

export async function patchProfile(data) {
  const response = await client.patch('/auth/me/', data);
  return response.data;
}

export async function changePassword(data) {
  const response = await client.post('/auth/password/change/', data);
  return response.data;
}

export async function logout() {
  // Cookie is sent automatically — no body needed
  const response = await client.post('/auth/logout/');
  return response.data;
}

export async function requestPasswordReset(email) {
  const response = await client.post('/auth/password/reset/', { email });
  return response.data;
}

export async function confirmPasswordReset(uidb64, token, new_password, new_password_confirm) {
  const response = await client.post('/auth/password/reset/confirm/', {
    uidb64, token, new_password, new_password_confirm,
  });
  return response.data;
}
