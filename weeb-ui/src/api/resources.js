import { apiDelete, apiGet, apiPost, apiPut } from './http';

export const resourcesApi = {
  list: async (endpoint, params = {}) => apiGet(endpoint, params),
  get: async (endpoint, id) => apiGet(`${endpoint}/${id}`),
  create: async (endpoint, payload) => apiPost(endpoint, payload),
  update: async (endpoint, id, payload) => apiPut(`${endpoint}/${id}`, payload),
  remove: async (endpoint, id) => apiDelete(`${endpoint}/${id}`),
};
