import apiClient from '../lib/axios';

export async function apiGet(url, params) {
  const response = await apiClient.get(url, { params });
  return response.data;
}

export async function apiPost(url, payload) {
  const response = await apiClient.post(url, payload);
  return response.data;
}

export async function apiPut(url, payload) {
  const response = await apiClient.put(url, payload);
  return response.data;
}

export async function apiDelete(url, data) {
  const response = await apiClient.delete(url, data ? { data } : undefined);
  return response.data;
}
