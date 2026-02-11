import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Token refresh lock to prevent race conditions
let isRefreshing = false;
let pendingRequests = [];

function onTokenRefreshed(token) {
  pendingRequests.forEach((callback) => callback(token));
  pendingRequests = [];
}

function onRefreshFailed() {
  pendingRequests.forEach((callback) => callback(null));
  pendingRequests = [];
}

// Response interceptor to handle 401 and refresh token
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If already refreshing, queue this request to wait
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(client(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        isRefreshing = true;
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('access_token', access);

          isRefreshing = false;
          onTokenRefreshed(access);

          originalRequest.headers.Authorization = `Bearer ${access}`;
          return client(originalRequest);
        } catch (refreshError) {
          isRefreshing = false;
          onRefreshFailed();
          // Refresh failed, clear tokens and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default client;
