import CrudResourcePage from '../features/shared/CrudResourcePage';
import { configs } from '../features/shared/crudConfigs';
import { useAccountOptions } from '../hooks/useAccountOptions';
import { useCategoryOptions } from '../hooks/useCategoryOptions';

export default function TransactionsPage({ type }) {
  const categoryOptions = useCategoryOptions();
  const accountOptions = useAccountOptions();
  const options = { ...categoryOptions, ...accountOptions };
  const config = {
    ...configs.transactions,
    title: type === 'income' ? 'Pemasukan' : type === 'expense' ? 'Pengeluaran' : 'Transaksi',
    endpoint: type === 'income' ? '/incomes' : type === 'expense' ? '/expenses' : '/transactions',
    initialParams: type ? {} : {},
    defaultValues: { ...configs.transactions.defaultValues, transaction_type: type || 'expense', need_type: type === 'income' ? '' : 'need' },
    fields: type ? configs.transactions.fields.filter((field) => field.name !== 'transaction_type') : configs.transactions.fields,
    toPayload: (values) => ({ ...values, transaction_type: type || values.transaction_type, account_id: values.account_id || null, category_id: values.category_id || null, need_type: values.need_type || null }),
  };

  return <CrudResourcePage config={config} options={options} />;
}
