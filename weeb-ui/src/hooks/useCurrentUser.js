import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../api/http';

let cachedUser = null;
let cachedError = null;
let inFlightUserRequest = null;

async function requestCurrentUser() {
  if (inFlightUserRequest) {
    return inFlightUserRequest;
  }

  inFlightUserRequest = apiGet('/auth/me')
    .then((response) => {
      cachedUser = response.data || null;
      cachedError = null;
      return cachedUser;
    })
    .catch((error) => {
      cachedUser = null;
      cachedError = error.response?.data?.message || 'User belum bisa dimuat.';
      throw error;
    })
    .finally(() => {
      inFlightUserRequest = null;
    });

  return inFlightUserRequest;
}

export function useCurrentUser() {
  const hasToken = Boolean(localStorage.getItem('weeb_auth_token'));
  const [user, setUser] = useState(() => (hasToken ? cachedUser : null));
  const [isLoading, setLoading] = useState(() => hasToken && !cachedUser);
  const [error, setError] = useState(() => cachedError);

  const loadUser = useCallback(async () => {
    if (!hasToken) {
      setUser(null);
      setError(null);
      setLoading(false);
      return null;
    }

    if (cachedUser) {
      setUser(cachedUser);
      setError(null);
      setLoading(false);
      return cachedUser;
    }

    setLoading(true);
    setError(null);

    try {
      const nextUser = await requestCurrentUser();
      setUser(nextUser);
      return nextUser;
    } catch (err) {
      setUser(null);
      setError(cachedError || err.response?.data?.message || 'User belum bisa dimuat.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [hasToken]);

  useEffect(() => {
    if (!hasToken) {
      setUser(null);
      setError(null);
      setLoading(false);
      return;
    }

    queueMicrotask(() => {
      loadUser();
    });
  }, [hasToken, loadUser]);

  return { user, isLoading, error, reloadUser: loadUser };
}
