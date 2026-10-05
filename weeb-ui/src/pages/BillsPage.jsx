import { useMemo } from 'react';
import CrudResourcePage from '../features/shared/CrudResourcePage';
import { configs } from '../features/shared/crudConfigs';
import { useAccountOptions } from '../hooks/useAccountOptions';
import { useCrudResource } from '../hooks/useCrudResource';
import { Card, CardContent } from '../components/ui/Card';
import { Skeleton } from '../components/feedback/LoadingSkeleton';
import ErrorState from '../components/feedback/ErrorState';
import EmptyState from '../components/feedback/EmptyState';
import DataTable, { DataTableSkeleton } from '../components/data/DataTable';
import StatusBadge from '../components/feedback/StatusBadge';
import { formatCurrency, formatDate } from '../lib/formatters';

const fundingColumns = [
  { key: 'transaction_date', label: 'Tanggal', render: (row) => formatDate(row.transaction_date) },
  {
    key: 'description',
    label: 'Deskripsi',
    mobileTitle: true,
    render: (row) => row.description || row.notes || '-',
  },
  {
    key: 'entry_type',
    label: 'Jenis',
    render: (row) => (
      <StatusBadge value={row.entry_type === 'account_allocation' ? 'account_allocation' : 'income'}>
        {row.entry_type === 'account_allocation' ? 'Alokasi Dana' : 'Dana Masuk'}
      </StatusBadge>
    ),
  },
  {
    key: 'account',
    label: 'Rekening',
    render: (row) => row.account?.name || '-',
  },
  {
    key: 'amount',
    label: 'Nominal',
    render: (row) => <span className="font-semibold tabular-nums text-success-base">+{formatCurrency(row.amount)}</span>,
  },
];

/** Whether the money parked for bills covers what is due. */
function BillsSummary({ bills }) {
  const accountOptions = useAccountOptions();

  const totalBillFunds = useMemo(
    () => (accountOptions.accounts || [])
      .filter((account) => account.purpose === 'bills')
      .reduce((total, account) => total + Number(account.balance || 0), 0),
    [accountOptions.accounts],
  );

  const monthlyBills = useMemo(
    () => bills.items.filter((bill) => bill.status === 'active').reduce((total, bill) => total + Number(bill.amount_estimate || 0), 0),
    [bills.items],
  );
  const remaining = totalBillFunds - monthlyBills;

  const stats = [
    { label: 'Dana tagihan tersedia', value: formatCurrency(totalBillFunds), tone: 'text-text-title' },
    { label: 'Total tagihan aktif', value: formatCurrency(monthlyBills), tone: 'text-text-title', isLoading: bills.isLoading },
    {
      label: remaining < 0 ? 'Kekurangan dana' : 'Sisa setelah tagihan',
      value: formatCurrency(Math.abs(remaining)),
      tone: remaining < 0 ? 'text-danger-base' : 'text-success-base',
      isLoading: bills.isLoading,
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent>
            <p className="text-sm text-text-muted">{stat.label}</p>
            {stat.isLoading
              ? <Skeleton className="mt-2 h-7 w-32" />
              : <p className={`mt-1 text-2xl font-semibold tabular-nums ${stat.tone}`}>{stat.value}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Allocations and other income that landed on the bills accounts. */
function BillsFunding() {
  const fundingResource = useCrudResource('/transactions', {
    transaction_type: 'income',
    account_purpose: 'bills',
    per_page: 100,
  });

  const fundingRows = useMemo(
    () => (fundingResource.items || []).filter((item) => item.transaction_type === 'income'),
    [fundingResource.items],
  );

  return (
    <section className="space-y-2 pt-1">
      <h2 className="text-base font-semibold text-text-title">Dana masuk ke rekening tagihan</h2>
      {fundingResource.isLoading ? (
        <DataTableSkeleton columns={fundingColumns} rows={4} hasActions={false} />
      ) : fundingResource.error ? (
        <ErrorState message={fundingResource.error} onRetry={() => fundingResource.load()} />
      ) : fundingRows.length === 0 ? (
        <EmptyState
          title="Belum ada dana tagihan"
          description="Alokasikan dana ke rekening Tagihan dari menu Rekening agar riwayatnya muncul di sini."
        />
      ) : (
        <DataTable columns={fundingColumns} rows={fundingRows} />
      )}
    </section>
  );
}

export default function BillsPage() {
  return (
    <CrudResourcePage
      config={{ ...configs.bills, title: 'Tagihan' }}
      topContent={({ resource }) => <BillsSummary bills={resource} />}
      bottomContent={<BillsFunding />}
    />
  );
}
