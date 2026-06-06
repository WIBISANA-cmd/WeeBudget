import axios from 'axios';

function resolveApiBaseUrl() {
  const envBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim();

  if (envBaseUrl) {
    return envBaseUrl;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalEnvironment = ['localhost', '127.0.0.1', '::1'].includes(hostname);

    if (isLocalEnvironment) {
      return 'http://localhost:8000/api';
    }
  }

  return '/api';
}

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('weeb_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('weeb_auth_token');

      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/auth/google/callback';
      if (!isAuthPage) {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
