import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import CrudResourcePage from '../features/shared/CrudResourcePage';
import { configs } from '../features/shared/crudConfigs';
import { useAccountOptions } from '../hooks/useAccountOptions';
import { useCategoryOptions } from '../hooks/useCategoryOptions';
import { Card, CardContent } from '../components/ui/Card';
import { formatCurrency, formatDate } from '../lib/formatters';
import { cn } from '../lib/utils';

const isIncome = (row) => row.transaction_type === 'income';
const signedAmount = (row) => `${isIncome(row) ? '+' : '-'}${formatCurrency(row.amount)}`;
const amountClass = (row) => isIncome(row) ? 'text-success-base' : 'text-danger-base';
const transactionTypeTabs = [
  { label: 'Pemasukan', to: '/transactions/income' },
  { label: 'Pengeluaran', to: '/transactions/expense' },
];

export default function TransactionsPage({ type }) {
  const categoryOptions = useCategoryOptions();
  const accountOptions = useAccountOptions();
  const options = { ...categoryOptions, ...accountOptions };
  const transactionType = type || 'expense';
  const config = {
    ...configs.transactions,
    title: type === 'income' ? 'Pemasukan' : type === 'expense' ? 'Pengeluaran' : 'Transaksi',
    description: type ? '' : 'Kelola semua arus kas masuk dan keluar dari halaman transaksi utama.',
    tableDescription: type ? '' : 'Semua transaksi tampil dalam satu tempat untuk memudahkan peninjauan.',
    endpoint: type === 'income' ? '/incomes' : type === 'expense' ? '/expenses' : '/transactions',
    accountScoped: false,
    initialParams: { per_page: 1000 },
    defaultValues: { ...configs.transactions.defaultValues, transaction_type: transactionType, need_type: type === 'income' ? '' : 'need', notes: undefined },
    columns: configs.transactions.columns.map((column) => (
      column.key === 'amount'
        ? { ...column, render: (row) => <span className={amountClass(row)}>{signedAmount(row)}</span> }
        : column
    )),
    fields: [
      ...(type ? [] : [{ name: 'transaction_type', label: 'Tipe', type: 'tabs', options: [{ value: 'income', label: 'Pemasukan' }, { value: 'expense', label: 'Pengeluaran' }], clearFieldsOnChange: ['category_id'] }]),
      { name: 'account_id', label: 'Sumber Rekening', type: 'select', optionsKey: 'accounts', placeholder: 'Pilih rekening sumber transaksi' },
      {
        name: 'category_id',
        label: 'Kategori',
        type: 'select',
        optionsKey: 'categories',
        clearFieldsOnChange: [],
        getOptions: ({ options: categories, values }) => {
          const activeType = type || values?.transaction_type || 'expense';
          return categories.filter((category) => category.type === activeType || category.type === 'both');
        },
      },
      { name: 'amount', label: 'Nominal', type: 'number', valueAsNumber: true },
      { name: 'transaction_date', label: 'Tanggal', type: 'date' },
      { name: 'description', label: 'Deskripsi / Keterangan', full: true, placeholder: 'Contoh: Belanja mingguan, transfer dari freelance' },
    ],
    mobileColumns: {
      title: (row) => row.description || row.category?.name || '-',
      titleLabel: 'Deskripsi',
      numberLabel: 'No',
      amountLabel: 'Nominal',
      amount: signedAmount,
      amountClass,
      dateKey: (row) => row.transaction_date,
      groupSummary: (rows) => {
        const incomeTotal = rows
          .filter((row) => row.transaction_type === 'income')
          .reduce((total, row) => total + Number(row.amount || 0), 0);
        const expenseTotal = rows
          .filter((row) => row.transaction_type === 'expense')
          .reduce((total, row) => total + Number(row.amount || 0), 0);

        return [
          { label: 'Pemasukan', value: formatCurrency(incomeTotal) },
          { label: 'Pengeluaran', value: formatCurrency(expenseTotal) },
        ];
      },
    },
    detailRows: [
      { label: 'Tanggal', render: (row) => formatDate(row.transaction_date) },
      { label: 'Rekening', render: (row) => row.account?.name || '-' },
      { label: 'Kategori', render: (row) => row.category?.name || '-' },
      { label: 'Tipe', render: (row) => row.transaction_type === 'income' ? 'Pemasukan' : 'Pengeluaran' },
      { label: 'Nominal', render: (row) => <span className={amountClass(row)}>{signedAmount(row)}</span> },
    ],
    toPayload: (values, _editing, formOptions) => {
      const selectedCategory = formOptions.categories?.find((category) => String(category.value) === String(values.category_id || ''));
      const activeType = type || values.transaction_type;

      return {
        ...values,
        transaction_type: activeType,
        account_id: values.account_id || null,
        category_id: values.category_id || null,
        description: values.description || null,
        need_type: activeType === 'income' ? null : selectedCategory?.needType || values.need_type || null,
        notes: undefined,
      };
    },
  };

  return (
    <CrudResourcePage
      config={config}
      options={options}
      topContent={({ resource }) => {
        const incomeTotal = resource.items
          .filter((row) => row.transaction_type === 'income')
          .reduce((total, row) => total + Number(row.amount || 0), 0);
        const expenseTotal = resource.items
          .filter((row) => row.transaction_type === 'expense')
          .reduce((total, row) => total + Number(row.amount || 0), 0);

        return (
          <div className="space-y-4">
            <div className="rounded-[24px] border border-border-subtle bg-gradient-to-br from-surface-panel via-surface-panel to-surface-100/70 p-3 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] md:rounded-[28px] md:p-4">
              <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
                {transactionTypeTabs.map((tab) => (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    className={({ isActive }) => cn(
                      'flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors',
                      isActive
                        ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/20'
                        : 'bg-surface-panel text-text-body hover:border-primary-500 hover:text-primary-600'
                    )}
                  >
                    {tab.label}
                  </NavLink>
                ))}
              </div>
            </div>

            <div className="hidden gap-4 md:grid xl:grid-cols-2">
              <Card className="border-success-base/20 bg-gradient-to-br from-success-base/8 via-surface-panel to-surface-panel">
                <CardContent className="space-y-2">
                  <p className="text-sm font-medium text-text-muted">Total pemasukan periode saat ini</p>
                  <p className="text-3xl font-semibold tracking-tight text-text-title">{formatCurrency(incomeTotal)}</p>
                </CardContent>
              </Card>
              <Card className="border-danger-base/20 bg-gradient-to-br from-danger-base/8 via-surface-panel to-surface-panel">
                <CardContent className="space-y-2">
                  <p className="text-sm font-medium text-text-muted">Total pengeluaran periode saat ini</p>
                  <p className="text-3xl font-semibold tracking-tight text-text-title">{formatCurrency(expenseTotal)}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      }}
    />
  );
}
