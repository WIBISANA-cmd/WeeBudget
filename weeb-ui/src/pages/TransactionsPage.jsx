import CrudResourcePage from '../features/shared/CrudResourcePage';
import { configs } from '../features/shared/crudConfigs';
import { useAccountOptions } from '../hooks/useAccountOptions';
import { useCategoryOptions } from '../hooks/useCategoryOptions';
import { formatCurrency, formatDate } from '../lib/formatters';

const needsByCategory = {
  Gaji: ['Gaji bulanan', 'Rapel gaji', 'THR'],
  Lembur: ['Lembur weekday', 'Lembur weekend', 'Tambahan shift'],
  Bonus: ['Bonus kerja', 'Bonus target', 'Reward'],
  Freelance: ['Project freelance', 'Jasa sampingan', 'Retainer'],
  Jualan: ['Penjualan barang', 'Penjualan jasa', 'Komisi'],
  Makan: ['Makan harian', 'Belanja lauk', 'Bekal'],
  Transport: ['Bensin', 'Ojek/taksi', 'Parkir', 'Transport umum'],
  'Kos/Kontrakan': ['Sewa bulanan', 'Iuran kos', 'Deposit'],
  'Pulsa & Internet': ['Paket data', 'WiFi rumah', 'Pulsa'],
  'Listrik & Air': ['Token listrik', 'Tagihan air', 'Iuran utilitas'],
  Cicilan: ['Cicilan wajib', 'Paylater', 'Utang pribadi'],
  Keluarga: ['Kirim keluarga', 'Kebutuhan orang tua', 'Bantuan rumah'],
  Kesehatan: ['Obat', 'Dokter', 'Asuransi'],
  'Belanja Rumah': ['Sembako', 'Peralatan rumah', 'Kebersihan'],
  Jajan: ['Kopi/snack', 'Makan luar', 'Self reward'],
  Hiburan: ['Streaming', 'Nonton', 'Game/hobi'],
  Tabungan: ['Tabungan rutin', 'Target tabungan', 'Sisa uang aman'],
  'Dana Darurat': ['Dana darurat bulanan', 'Cadangan kesehatan', 'Cadangan tak terduga'],
  Lainnya: ['Kebutuhan lain', 'Alokasi khusus'],
};

const getNeedLabel = (row) => row.description || row.category?.name || '-';
const isIncome = (row) => row.transaction_type === 'income';
const signedAmount = (row) => `${isIncome(row) ? '+' : '-'}${formatCurrency(row.amount)}`;
const amountClass = (row) => isIncome(row) ? 'text-success-base' : 'text-danger-base';

export default function TransactionsPage({ type }) {
  const categoryOptions = useCategoryOptions();
  const accountOptions = useAccountOptions();
  const options = { ...categoryOptions, ...accountOptions };
  const transactionType = type || 'expense';
  const config = {
    ...configs.transactions,
    title: type === 'income' ? 'Pemasukan' : type === 'expense' ? 'Pengeluaran' : 'Transaksi',
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
      ...(type ? [] : [{ name: 'transaction_type', label: 'Tipe', type: 'select', options: [{ value: 'income', label: 'Pemasukan' }, { value: 'expense', label: 'Pengeluaran' }], clearFieldsOnChange: ['category_id', 'description'] }]),
      { name: 'account_id', type: 'hidden' },
      {
        name: 'category_id',
        label: 'Kategori',
        type: 'select',
        optionsKey: 'categories',
        clearFieldsOnChange: ['description'],
        getOptions: ({ options: categories, values }) => {
          const activeType = type || values?.transaction_type || 'expense';
          return categories.filter((category) => category.type === activeType || category.type === 'both');
        },
      },
      {
        name: 'description',
        label: 'Kebutuhan',
        type: 'select',
        optionsKey: 'categories',
        getOptions: ({ options: categories, values }) => {
          const category = categories.find((item) => String(item.value) === String(values?.category_id || ''));
          if (!category) return [];

          return (needsByCategory[category.label] || [category.label]).map((need) => ({ value: need, label: need }));
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

  return <CrudResourcePage config={config} options={options} />;
}
