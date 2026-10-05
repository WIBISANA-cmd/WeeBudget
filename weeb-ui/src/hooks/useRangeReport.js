import { useEffect, useState } from 'react';
import { cachedGet } from '../api/http';
import { DATA_CHANGED_EVENT } from '../lib/pageRefresh';

/**
 * What the dashboard chart draws for one date range:
 *
 * - `flow`: money in and out per day for a pocket of accounts, with that pocket's balance now.
 *   `scope` is 'need' (the everyday-spending accounts) or 'all'.
 * - `breakdown`: expenses per category, from the same endpoint the Laporan page uses.
 *
 * The previous range stays on screen while the next one loads.
 */
export function useRangeReport(start, end, scope = 'need') {
  const [state, setState] = useState({ request: null, flow: null, breakdown: null, error: null });
  const [version, setVersion] = useState(0);
  const request = `${start}|${end}|${scope}`;

  // A save anywhere clears the request cache; ask again so the chart includes it.
  useEffect(() => {
    const refresh = () => setVersion((current) => current + 1);
    window.addEventListener(DATA_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, refresh);
  }, []);

  useEffect(() => {
    if (!start || !end) return undefined;
    let isCurrent = true;
    const key = `${start}|${end}|${scope}`;

    Promise.all([
      cachedGet('/reports/pocket-flow', { start, end, scope }),
      cachedGet('/reports/category-breakdown', { start, end }),
    ])
      .then(([flow, category]) => {
        if (isCurrent) setState({ request: key, flow: flow.data || null, breakdown: category.data || [], error: null });
      })
      .catch((err) => {
        if (isCurrent) {
          setState((current) => ({
            ...current,
            request: key,
            error: err.response?.data?.message || 'Grafik belum bisa dimuat.',
          }));
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [start, end, scope, version]);

  return {
    flow: state.flow,
    breakdown: state.breakdown,
    error: state.error,
    isLoading: state.flow === null && !state.error,
    isRefreshing: state.request !== request,
  };
}
