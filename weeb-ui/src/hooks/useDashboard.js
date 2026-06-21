import { useCallback, useEffect, useRef, useState } from 'react';
import { getDashboard } from '../services/dashboardApi';

const POLL_INTERVAL = 30_000; // 30 seconds

export function useDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await getDashboard();
      setDashboard(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Dashboard belum bisa dimuat. Coba lagi sebentar.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    queueMicrotask(() => fetchDashboard(false));
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

  return {
    dashboard,
    isLoading,
    error,
    refetch: () => fetchDashboard(false),
  };
}
