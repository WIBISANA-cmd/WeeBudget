import { useEffect, useState } from 'react';
import { apiGet } from '../api/http';
import { formatCurrency } from '../lib/formatters';

export function useAccountOptions() {
  const [options, setOptions] = useState({ accounts: [] });

  const loadAccounts = async () => {
    try {
      const response = await apiGet('/accounts', { per_page: 100, is_active: true });
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
  };

  useEffect(() => {
    queueMicrotask(async () => {
      await loadAccounts();
    });
  }, []);

  return { ...options, reloadAccounts: loadAccounts };
}
