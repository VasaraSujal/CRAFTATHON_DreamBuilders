import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://craftathon-dreambuilders.onrender.com';
const STORAGE_KEY = 'secure-comm-user';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const updateStoredSession = (session) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const current = raw ? JSON.parse(raw) : {};
    const next = { ...current, ...session };
    if (session?.token) {
      next.token = session.token;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore localStorage issues
  }
};

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error?.response?.status;
    const requestUrl = String(originalRequest.url || '');
    const skipRefresh =
      originalRequest._retry ||
      requestUrl.includes('/api/users/login') ||
      requestUrl.includes('/api/users/login/mfa') ||
      requestUrl.includes('/api/users/refresh') ||
      requestUrl.includes('/api/users/logout');

    if (status === 401 && !skipRefresh) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = api.post('/api/users/refresh').finally(() => {
            refreshPromise = null;
          });
        }

        const refreshResponse = await refreshPromise;
        const nextSession = refreshResponse.data;
        if (nextSession?.token) {
          setAuthToken(nextSession.token);
          updateStoredSession(nextSession);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${nextSession.token}`;
          return api(originalRequest);
        }
      } catch {
        // fall through to original error
      }
    }

    return Promise.reject(error);
  },
);

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const loginUser = async (email, password) => {
  const response = await api.post('/api/users/login', { email, password });
  return response.data;
};

export const registerUser = async (payload) => {
  const response = await api.post('/api/users', payload);
  return response.data;
};

export const loginUserMfa = async (payload) => {
  const response = await api.post('/api/users/login/mfa', payload);
  return response.data;
};

export const refreshSession = async () => {
  const response = await api.post('/api/users/refresh');
  return response.data;
};

export const logoutSession = async () => {
  const response = await api.post('/api/users/logout');
  return response.data;
};

export const fetchTraffic = async (params = {}) => {
  const response = await api.get('/api/traffic', { params });
  return response.data;
};

export const fetchLiveTraffic = async () => {
  const response = await api.get('/api/traffic/live');
  return response.data;
};

export const fetchTrafficGraph = async () => {
  const response = await api.get('/api/traffic/graph');
  return response.data;
};

export const fetchAlerts = async () => {
  const response = await api.get('/api/alerts');
  return response.data;
};

export const fetchStats = async () => {
  const response = await api.get('/api/stats');
  return response.data;
};

export const fetchSignalStatus = async () => {
  const response = await api.get('/api/signals/status');
  return response.data;
};

export const simulateTraffic = async (type) => {
  const response = await api.post('/api/simulate', { type });
  return response.data;
};

// User Management
export const fetchUsers = async () => {
  const response = await api.get('/api/users');
  return response.data;
};

export const fetchPendingUsers = async () => {
  const response = await api.get('/api/users/pending');
  return response.data;
};

export const createUserByAdmin = async (payload) => {
  const response = await api.post('/api/users/admin', payload);
  return response.data;
};

export const updateUserRoleByAdmin = async (userId, role) => {
  const response = await api.patch(`/api/users/${userId}/role`, { role });
  return response.data;
};

export const updateUserApprovalByAdmin = async (userId, status) => {
  const response = await api.patch(`/api/users/${userId}/approval`, { status });
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/api/users/${userId}`);
  return response.data;
};

// Audit
export const fetchAuditSummary = async () => {
  const response = await api.get('/api/audit');
  return response.data;
};

export const setupMfa = async () => {
  const response = await api.post('/api/users/mfa/setup');
  return response.data;
};

export const enableMfa = async (code) => {
  const response = await api.post('/api/users/mfa/enable', { code });
  return response.data;
};

export const disableMfa = async (code) => {
  const response = await api.post('/api/users/mfa/disable', { code });
  return response.data;
};

export default api;
