import { useMemo } from 'react';
import CrudResourcePage from '../features/shared/CrudResourcePage';
import { configs } from '../features/shared/crudConfigs';
import { useAccountOptions } from '../hooks/useAccountOptions';
import { useCategoryOptions } from '../hooks/useCategoryOptions';
import { Card, CardContent } from '../components/ui/Card';
import { formatCurrency, formatDate } from '../lib/formatters';

const getNeedLabel = (row) => row.description || row.category?.name || '-';
const isIncome = (row) => row.transaction_type === 'income';
const signedAmount = (row) => `${isIncome(row) ? '+' : '-'}${formatCurrency(row.amount)}`;
const amountClass = (row) => isIncome(row) ? 'text-success-base' : 'text-danger-base';

export default function TransactionsPage({ type }) {
  const categoryOptions = useCategoryOptions();
  const accountOptions = useAccountOptions();
  const options = { ...categoryOptions, ...accountOptions };
  const transactionType = type || 'expense';
  const relevantCategories = useMemo(() => {
    return (categoryOptions.categories || []).filter((category) => {
      if (!type) return true;
      return category.type === transactionType || category.type === 'both';
    });
  }, [categoryOptions.categories, transactionType, type]);
  const totalAccountBalance = useMemo(
    () => (accountOptions.accounts || []).reduce((total, account) => total + Number(account.balance || 0), 0),
    [accountOptions.accounts]
  );
  const config = {
    ...configs.transactions,
    title: type === 'income' ? 'Pemasukan' : type === 'expense' ? 'Pengeluaran' : 'Transaksi',
    description: type === 'income'
      ? 'Pantau semua arus uang masuk ke rekening aktif, lengkap dengan kategori dan tujuan rekeningnya.'
      : type === 'expense'
        ? 'Catat pengeluaran dari rekening yang dipilih agar saldo dan pola belanja selalu terbaca dengan rapi.'
        : 'Kelola semua arus kas masuk dan keluar dari halaman transaksi utama.',
    tableDescription: type === 'income'
      ? 'Riwayat pemasukan ditampilkan per rekening aktif agar sumber dana lebih mudah dibaca.'
      : type === 'expense'
        ? 'Riwayat pengeluaran ditampilkan per rekening aktif agar aliran saldo lebih jelas.'
        : 'Semua transaksi tampil dalam satu tempat untuk memudahkan peninjauan.',
    endpoint: type === 'income' ? '/incomes' : type === 'expense' ? '/expenses' : '/transactions',
    accountScoped: true,
    initialParams: type ? {} : {},
    defaultValues: { ...configs.transactions.defaultValues, transaction_type: transactionType, need_type: type === 'income' ? '' : 'need', notes: undefined },
    columns: configs.transactions.columns.map((column) => (
      column.key === 'amount'
        ? { ...column, render: (row) => <span className={amountClass(row)}>{signedAmount(row)}</span> }
        : column
    )),
    fields: [
      ...(type ? [] : [{ name: 'transaction_type', label: 'Tipe', type: 'select', options: [{ value: 'income', label: 'Pemasukan' }, { value: 'expense', label: 'Pengeluaran' }], clearFieldsOnChange: ['category_id'] }]),
      { name: 'account_id', type: 'hidden' },
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
    ],
    mobileColumns: {
      title: getNeedLabel,
      subtitle: (row) => row.account?.name || '-',
      amount: signedAmount,
      amountClass,
      dateKey: (row) => row.transaction_date,
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
        need_type: activeType === 'income' ? null : selectedCategory?.needType || values.need_type || null,
        notes: undefined,
      };
    },
  };

  return (
    <CrudResourcePage
      config={config}
      options={options}
      topContent={(
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr_0.9fr]">
          <Card className={type === 'income'
            ? 'border-success-base/20 bg-gradient-to-br from-success-base/8 via-surface-panel to-surface-panel'
            : 'border-primary-500/20 bg-gradient-to-br from-primary-500/8 via-surface-panel to-surface-panel'}
          >
            <CardContent className="space-y-3">
              <p className="text-sm font-medium text-text-muted">Saldo rekening terhubung</p>
              <p className="text-3xl font-semibold tracking-tight text-text-title">{formatCurrency(totalAccountBalance)}</p>
              <p className="text-sm leading-6 text-text-muted">
                Nilai ini merangkum saldo dari rekening aktif yang tersedia untuk transaksi pada halaman ini.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2">
              <p className="text-sm font-medium text-text-muted">Rekening aktif</p>
              <p className="text-3xl font-semibold tracking-tight text-text-title">{(accountOptions.accounts || []).length}</p>
              <p className="text-sm text-text-muted">Bisa dipilih sebagai sumber atau tujuan transaksi.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2">
              <p className="text-sm font-medium text-text-muted">Kategori tersedia</p>
              <p className="text-3xl font-semibold tracking-tight text-text-title">{relevantCategories.length}</p>
              <p className="text-sm text-text-muted">Mengikuti tipe transaksi yang sedang dibuka.</p>
            </CardContent>
          </Card>
        </div>
      )}
    />
  );
}
