import { useCallback, useEffect, useState } from 'react';
import { resourcesApi } from '../api/resources';
import { DATA_CHANGED_EVENT } from '../lib/pageRefresh';

// Staged page load: stage 1 shows the last page-1 response for this endpoint+params instantly on
// revisit, stage 2 refreshes it from the network in the background. Any mutation wipes it, so a
// page never reopens on pre-save data.
const lastPages = new Map();
// Scoped to the auth token: a re-login in the same tab never shows the previous user's rows.
const pageKey = (endpoint, params) => `${localStorage.getItem('weeb_auth_token') ?? ''}|${endpoint}?${JSON.stringify(params)}`;
if (typeof window !== 'undefined') {
  window.addEventListener(DATA_CHANGED_EVENT, () => lastPages.clear());
}

function firstErrorMessage(errors) {
  if (!errors || typeof errors !== 'object') return null;

  for (const messages of Object.values(errors)) {
    if (Array.isArray(messages) && messages.length > 0) {
      return messages[0];
    }
  }

  return null;
}

export function useCrudResource(endpoint, initialParams = {}) {
  const [items, setItems] = useState(() => lastPages.get(pageKey(endpoint, initialParams))?.items ?? []);
  const [meta, setMeta] = useState(() => lastPages.get(pageKey(endpoint, initialParams))?.meta ?? null);
  const [isLoading, setIsLoading] = useState(() => !lastPages.has(pageKey(endpoint, initialParams)));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParams] = useState(initialParams);
  const [page, setPage] = useState(1);
  const [isIncrementing, setIsIncrementing] = useState(false);

  const load = useCallback(async (nextParams = params, targetPage = 1, append = false, silent = false) => {
    const key = pageKey(endpoint, nextParams);
    if (append) {
      setIsIncrementing(true);
    } else if (lastPages.has(key)) {
      setItems(lastPages.get(key).items);
      setMeta(lastPages.get(key).meta);
    } else if (!silent) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const response = await resourcesApi.list(endpoint, { ...nextParams, page: targetPage });
      if (append) {
        setItems((prev) => [...prev, ...(response.data || [])]);
      } else {
        setItems(response.data || []);
        lastPages.set(key, { items: response.data || [], meta: response.meta || null });
      }
      setMeta(response.meta || null);
      setPage(targetPage);
    } catch (err) {
      setError(err.response?.data?.message || 'Data belum bisa dimuat.');
    } finally {
      setIsLoading(false);
      setIsIncrementing(false);
    }
  }, [endpoint, params]);

  useEffect(() => {
    queueMicrotask(() => load(params, 1, false));
  }, [load, params]);

  useEffect(() => {
    // Refresh in place: keep the current rows on screen instead of flashing a skeleton after a save.
    const reload = () => load(params, 1, false, true);
    window.addEventListener(DATA_CHANGED_EVENT, reload);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, reload);
  }, [load, params]);

  const loadNextPage = useCallback(async () => {
    if (isLoading || isIncrementing || !meta || page >= meta.last_page) return;
    await load(params, page + 1, true);
  }, [load, params, page, meta, isLoading, isIncrementing]);

  const save = async (payload, id = null) => {
    setIsSaving(true);
    try {
      if (Array.isArray(payload)) {
        for (const item of payload) {
          await resourcesApi.create(endpoint, item);
        }
      } else if (id) {
        await resourcesApi.update(endpoint, id, payload);
      } else {
        await resourcesApi.create(endpoint, payload);
      }
      // The mutation's data-changed event drives the reload.
      return { ok: true };
    } catch (err) {
      const validationMessage = firstErrorMessage(err.response?.data?.errors);
      return {
        ok: false,
        message: validationMessage || err.response?.data?.message || 'Data belum bisa disimpan.',
        errors: err.response?.data?.errors || {},
      };
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await resourcesApi.remove(endpoint, id);
      // The mutation's data-changed event drives the reload.
      return { ok: true };
    } catch (err) {
      const validationMessage = firstErrorMessage(err.response?.data?.errors);
      return {
        ok: false,
        message: validationMessage || err.response?.data?.message || 'Data belum bisa dihapus.',
      };
    }
  };

  return { items, meta, isLoading, isSaving, error, params, setParams, load, save, remove, loadNextPage, isIncrementing };
}
