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

  const load = useCallback(async (nextParams = params) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await resourcesApi.list(endpoint, nextParams);
      setItems(response.data || []);
      setMeta(response.meta || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Data belum bisa dimuat.');
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, params]);

  useEffect(() => {
    queueMicrotask(() => load(params));
  }, [load, params]);

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

  return { items, meta, isLoading, isSaving, error, params, setParams, load, save, remove };
}
