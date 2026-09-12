import { useCallback, useEffect, useRef, useState } from 'react';
import { getDashboard } from '../services/dashboardApi';
import { DATA_CHANGED_EVENT } from '../lib/pageRefresh';

const POLL_INTERVAL = 30_000; // 30 seconds

// Last payload: returning to Home renders it at once and refreshes silently behind it.
// Dropped on any mutation so the numbers never reopen stale after a save.
// Stored with its token so a re-login in the same tab never renders the previous user's numbers.
let lastDashboard = null;
const cachedDashboard = () => (
  lastDashboard && lastDashboard.token === localStorage.getItem('weeb_auth_token') ? lastDashboard.data : null
);
if (typeof window !== 'undefined') {
  window.addEventListener(DATA_CHANGED_EVENT, () => {
    lastDashboard = null;
  });
}

export function useDashboard() {
  const [dashboard, setDashboard] = useState(cachedDashboard);
  const [isLoading, setIsLoading] = useState(() => !cachedDashboard());
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const token = localStorage.getItem('weeb_auth_token');
      const data = await getDashboard();
      lastDashboard = { token, data };
      setDashboard(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Dashboard belum bisa dimuat. Coba lagi sebentar.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch — silent when a cached payload is already on screen
  useEffect(() => {
    queueMicrotask(() => fetchDashboard(Boolean(cachedDashboard())));
  }, [fetchDashboard]);

  // Auto-refetch every 30s for realtime data
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchDashboard(true);
      }
    }, POLL_INTERVAL);

    return () => clearInterval(intervalRef.current);
  }, [fetchDashboard]);

  // Refetch when tab becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboard(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchDashboard]);

  // A save anywhere in the app refreshes the numbers in place
  useEffect(() => {
    const refresh = () => fetchDashboard(true);
    window.addEventListener(DATA_CHANGED_EVENT, refresh);

    return () => window.removeEventListener(DATA_CHANGED_EVENT, refresh);
  }, [fetchDashboard]);

  return {
    dashboard,
    isLoading,
    error,
    refetch: () => fetchDashboard(false),
  };
}
