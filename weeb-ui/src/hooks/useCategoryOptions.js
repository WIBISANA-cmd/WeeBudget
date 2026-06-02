import { useEffect, useState } from 'react';
import { apiGet } from '../api/http';

export function useCategoryOptions() {
  const [options, setOptions] = useState({ categories: [], expenseCategories: [] });

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const response = await apiGet('/categories', { per_page: 100 });
        const categories = (response.data || []).map((category) => ({
          value: category.id,
          label: category.name,
          type: category.transaction_type,
        }));
        setOptions({
          categories,
          expenseCategories: categories.filter((category) => category.type === 'expense' || category.type === 'both'),
        });
      } catch {
        setOptions({ categories: [], expenseCategories: [] });
      }
    });
  }, []);

  return options;
}
