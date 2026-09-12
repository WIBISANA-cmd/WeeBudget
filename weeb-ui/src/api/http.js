import apiClient from '../lib/axios';
import { DATA_CHANGED_EVENT } from '../lib/pageRefresh';

// Caches the promise, so concurrent callers share one request and later mounts skip the network.
// Every mutation below clears it, so the only staleness window is a change made outside this tab.
// ponytail: no TTL, add one if server-side changes from elsewhere need to land without a mutation.
const getCache = new Map();

export async function apiGet(url, params) {
  const response = await apiClient.get(url, { params });
  return response.data;
}

export function cachedGet(url, params) {
  // Scoped to the signed-in token so one user's responses never serve another after a re-login.
  const token = globalThis.localStorage?.getItem('weeb_auth_token') ?? '';
  const key = `${token}|${url}${JSON.stringify(params ?? {})}`;
  if (!getCache.has(key)) {
    getCache.set(key, apiGet(url, params).catch((error) => {
      getCache.delete(key);
      throw error;
    }));
  }

  return getCache.get(key);
}

export function clearApiCache() {
  getCache.clear();
}

function announceMutation() {
  clearApiCache();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
  }
}

export async function apiPost(url, payload, config) {
  const response = await apiClient.post(url, payload, config);
  announceMutation();
  return response.data;
}

export async function apiPut(url, payload) {
  const response = await apiClient.put(url, payload);
  announceMutation();
  return response.data;
}

export async function apiDelete(url, data) {
  const response = await apiClient.delete(url, data ? { data } : undefined);
  announceMutation();
  return response.data;
}
