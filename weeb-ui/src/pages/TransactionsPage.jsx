import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Mic } from 'lucide-react';
import CrudResourcePage from '../features/shared/CrudResourcePage';
import TransactionFilters from '../features/finance/TransactionFilters';
import { configs } from '../features/shared/crudConfigs';
import { useAccountOptions } from '../hooks/useAccountOptions';
import { useCategoryOptions } from '../hooks/useCategoryOptions';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { buildTransactionParams, defaultFilters } from '../features/finance/transactionFilterParams';
import Button from '../components/ui/Button';
import { Skeleton } from '../components/feedback/LoadingSkeleton';
import StatusBadge from '../components/feedback/StatusBadge';
import VoiceTransactionModal from '../components/VoiceTransactionModal';
import { formatCurrency, formatDate } from '../lib/formatters';
import { cn } from '../lib/utils';

const isIncome = (row) => row.transaction_type === 'income';
const isAllocation = (row) => row.entry_type === 'account_allocation';
const signedAmount = (row) => {
  if (isAllocation(row)) return formatCurrency(row.amount);
  return `${isIncome(row) ? '+' : '-'}${formatCurrency(row.amount)}`;
};
const amountClass = (row) => {
  if (isAllocation(row)) return 'text-primary-600';
  return isIncome(row) ? 'text-success-base' : 'text-danger-base';
};
/** Allocation rows are listed once, so the label has to name both sides of the move. */
const allocationLabel = (row) => {
  const self = row.account?.name || 'Rekening ini';
  const other = row.metadata?.counterpart_account_name || 'rekening lain';
  const [from, to] = row.metadata?.direction === 'in' ? [other, self] : [self, other];

  return `Alokasi dana: ${from} → ${to}`;
};
const rowDescription = (row) => {
  if (isAllocation(row)) return allocationLabel(row);
  return row.description || row.category?.name || '-';
};
const transactionTypeTabs = [
  { label: 'Pemasukan', to: '/transactions/income' },
  { label: 'Pengeluaran', to: '/transactions/expense' },
];

/** Keyed by type so switching the Pemasukan/Pengeluaran tab starts over from the default payday filter. */
export default function TransactionsPage({ type }) {
  return <TransactionsView key={type || 'all'} type={type} />;
}

function TransactionsView({ type }) {
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const { user } = useCurrentUser();
  const paydayDay = user?.profile?.payday_day;
  const categoryOptions = useCategoryOptions();
  const accountOptions = useAccountOptions();
  const options = { ...categoryOptions, ...accountOptions };
  const transactionType = type || 'expense';

  const config = {
    ...configs.transactions,
    title: type === 'income' ? 'Pemasukan' : type === 'expense' ? 'Pengeluaran' : 'Transaksi',
    endpoint: type === 'income' ? '/incomes' : type === 'expense' ? '/expenses' : '/transactions',
    accountScoped: false,
    initialParams: buildTransactionParams(defaultFilters, { per_page: 30 }, undefined, paydayDay),
    noCard: true,
    defaultValues: { ...configs.transactions.defaultValues, transaction_type: transactionType, need_type: type === 'income' ? '' : 'need', notes: undefined },
    columns: configs.transactions.columns.map((column) => {
      if (column.key === 'amount') {
        return { ...column, render: (row) => <span className={amountClass(row)}>{signedAmount(row)}</span> };
      }

      if (column.key === 'description') {
        return { ...column, render: rowDescription };
      }

      if (column.key === 'transaction_type') {
        return {
          ...column,
          render: (row) => (
            <StatusBadge value={isAllocation(row) ? 'account_allocation' : row.transaction_type}>
              {isAllocation(row) ? 'Alokasi Dana' : (isIncome(row) ? 'Pemasukan' : 'Pengeluaran')}
            </StatusBadge>
          ),
        };
      }

      return column;
    }),
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
      title: rowDescription,
      subtitle: (row) => [row.category?.name, row.account?.name].filter(Boolean).join(' · '),
      amount: signedAmount,
      amountClass,
      dateKey: (row) => row.transaction_date,
      groupSummary: (rows) => {
        const incomeTotal = rows
          .filter((row) => row.transaction_type === 'income' && !isAllocation(row))
          .reduce((total, row) => total + Number(row.amount || 0), 0);
        const expenseTotal = rows
          .filter((row) => row.transaction_type === 'expense' && !isAllocation(row))
          .reduce((total, row) => total + Number(row.amount || 0), 0);

        return [
          { label: 'Pemasukan', value: formatCurrency(incomeTotal) },
          { label: 'Pengeluaran', value: formatCurrency(expenseTotal) },
        ];
      },
    },
    detailRows: [
      { label: 'Tanggal', render: (row) => formatDate(row.transaction_date) },
      { label: 'Keterangan', render: rowDescription },
      { label: 'Rekening', render: (row) => row.account?.name || '-' },
      { label: 'Kategori', render: (row) => row.category?.name || '-' },
      { label: 'Tipe', render: (row) => isAllocation(row) ? 'Alokasi Dana' : (row.transaction_type === 'income' ? 'Pemasukan' : 'Pengeluaran') },
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
    <>
      <CrudResourcePage
        config={config}
        options={options}
        headerActions={(
          <Button type="button" variant="accent" onClick={() => setVoiceModalOpen(true)} className="whitespace-nowrap">
            <Mic size={16} className="mr-2" />
            Catat via suara
          </Button>
        )}
        topContent={({ resource }) => {
          const totalOf = (transactionType) => resource.items
            .filter((row) => row.transaction_type === transactionType && !isAllocation(row))
            .reduce((total, row) => total + Number(row.amount || 0), 0);
          // A typed page only ever lists its own type, so the other total would always read zero.
          const totals = [
            { type: 'income', label: 'Pemasukan', tone: 'text-success-base' },
            { type: 'expense', label: 'Pengeluaran', tone: 'text-danger-base' },
          ].filter((item) => !type || item.type === type);

          return (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex rounded-xl border border-border-subtle bg-surface-panel p-1 max-md:w-full">
                  {transactionTypeTabs.map((tab) => (
                    <NavLink
                      key={tab.to}
                      to={tab.to}
                      className={({ isActive }) => cn(
                        'flex-1 rounded-lg px-4 py-2 text-center text-sm font-semibold transition-colors',
                        isActive ? 'bg-primary-500 text-white' : 'text-text-muted hover:text-text-title',
                      )}
                    >
                      {tab.label}
                    </NavLink>
                  ))}
                </div>

                <dl className="flex gap-6">
                  {totals.map((item) => (
                    <div key={item.type} className="md:text-right">
                      <dt className="text-xs text-text-muted">{item.label}</dt>
                      {resource.isLoading
                        ? <Skeleton className="mt-1.5 h-5 w-28" />
                        : <dd className={cn('text-lg font-semibold tabular-nums', item.tone)}>{formatCurrency(totalOf(item.type))}</dd>}
                    </div>
                  ))}
                </dl>
              </div>

              <TransactionFilters
                resource={resource}
                categories={options.categories || []}
                accounts={options.accounts || []}
                type={type}
                paydayDay={paydayDay}
              />
            </div>
          );
        }}
      />

      <VoiceTransactionModal open={voiceModalOpen} onClose={() => setVoiceModalOpen(false)} />
    </>
  );
}
