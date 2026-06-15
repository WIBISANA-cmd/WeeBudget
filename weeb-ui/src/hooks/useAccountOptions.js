import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../api/http';
import { formatCurrency } from '../lib/formatters';

export function useAccountOptions({ includeInactive = false } = {}) {
  const [options, setOptions] = useState({ accounts: [] });

  const loadAccounts = useCallback(async () => {
    try {
      const response = await apiGet('/accounts', includeInactive ? { per_page: 100 } : { per_page: 100, is_active: true });
      const accounts = (response.data || []).map((account) => ({
        value: account.id,
        label: `${account.name} - ${formatCurrency(account.current_balance)}`,
        purpose: account.purpose,
        type: account.type,
        balance: account.current_balance,
      }));

      setOptions({ accounts });
    } catch {
      setOptions({ accounts: [] });
    }
  }, [includeInactive]);

  useEffect(() => {
    queueMicrotask(async () => {
      await loadAccounts();
    });
  }, [loadAccounts]);

  return { ...options, reloadAccounts: loadAccounts };
}
