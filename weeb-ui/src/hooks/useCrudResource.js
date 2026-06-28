import { useCallback, useEffect, useState } from 'react';
import { resourcesApi } from '../api/resources';

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
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParams] = useState(initialParams);
  const [page, setPage] = useState(1);
  const [isIncrementing, setIsIncrementing] = useState(false);

  const load = useCallback(async (nextParams = params, targetPage = 1, append = false) => {
    if (append) {
      setIsIncrementing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const response = await resourcesApi.list(endpoint, { ...nextParams, page: targetPage });
      if (append) {
        setItems((prev) => [...prev, ...(response.data || [])]);
      } else {
        setItems(response.data || []);
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
      await load(params);
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
      await load(params);
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
