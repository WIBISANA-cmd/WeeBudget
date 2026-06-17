import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../api/http';

export function useCurrentUser() {
  const hasToken = Boolean(localStorage.getItem('weeb_auth_token'));
  const [user, setUser] = useState(null);
  const [isLoading, setLoading] = useState(hasToken);
  const [error, setError] = useState(null);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiGet('/auth/me');
      setUser(response.data || null);
      return response.data || null;
    } catch (err) {
      setUser(null);
      setError(err.response?.data?.message || 'User belum bisa dimuat.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasToken) {
      return;
    }

    queueMicrotask(() => {
      loadUser();
    });
  }, [hasToken, loadUser]);

  return { user, isLoading, error, reloadUser: loadUser };
}
