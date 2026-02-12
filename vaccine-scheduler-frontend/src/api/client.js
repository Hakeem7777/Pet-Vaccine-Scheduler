import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Helper to read CSRF token from cookie (Django sets csrftoken cookie)
function getCSRFToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Request interceptor to attach CSRF token for unsafe methods
client.interceptors.request.use(
  (config) => {
    const method = config.method?.toUpperCase();
    if (method && !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
      const csrfToken = getCSRFToken();
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Token refresh lock to prevent race conditions
let isRefreshing = false;
let pendingRequests = [];

function onTokenRefreshed() {
  pendingRequests.forEach(({ resolve }) => resolve());
  pendingRequests = [];
}

function onRefreshFailed() {
  pendingRequests.forEach(({ reject }) => reject());
  pendingRequests = [];
}

// URLs that should NOT trigger token refresh on 401
// (auth probes and auth endpoints — a 401 here is expected, not a stale session)
const SKIP_REFRESH_URLS = ['/auth/me/', '/auth/login/', '/auth/refresh/', '/auth/register/'];

function shouldSkipRefresh(url) {
  return SKIP_REFRESH_URLS.some((path) => url?.includes(path));
}

// Response interceptor to handle 401 and refresh token via cookie
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh for 401s on protected data endpoints
    // Skip auth-probing endpoints (me/, login/, refresh/) to prevent loops
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !shouldSkipRefresh(originalRequest.url)
    ) {
      originalRequest._retry = true;

      // If already refreshing, queue this request to wait
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            resolve: () => resolve(client(originalRequest)),
            reject: () => reject(error),
          });
        });
      }

      isRefreshing = true;
      try {
        // Cookie is sent automatically — no body needed
        await axios.post(`${API_BASE_URL}/auth/refresh/`, null, {
          withCredentials: true,
        });

        isRefreshing = false;
        onTokenRefreshed();

        return client(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        onRefreshFailed();
        // Refresh failed — redirect to login only if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
