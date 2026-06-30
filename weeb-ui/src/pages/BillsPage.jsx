import { useMemo } from 'react';
import CrudResourcePage from '../features/shared/CrudResourcePage';
import { configs } from '../features/shared/crudConfigs';
import { useAccountOptions } from '../hooks/useAccountOptions';
import { useCrudResource } from '../hooks/useCrudResource';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import LoadingSkeleton from '../components/feedback/LoadingSkeleton';
import ErrorState from '../components/feedback/ErrorState';
import EmptyState from '../components/feedback/EmptyState';
import DataTable from '../components/data/DataTable';
import StatusBadge from '../components/feedback/StatusBadge';
import { formatCurrency, formatDate } from '../lib/formatters';

function BillsFundingPanel() {
  const accountOptions = useAccountOptions();
  const fundingResource = useCrudResource('/transactions', {
    transaction_type: 'income',
    account_purpose: 'bills',
    per_page: 100,
  });

  const billAccounts = useMemo(
    () => (accountOptions.accounts || []).filter((account) => account.purpose === 'bills'),
    [accountOptions.accounts],
  );

  const totalBillFunds = useMemo(
    () => billAccounts.reduce((total, account) => total + Number(account.balance || 0), 0),
    [billAccounts],
  );

  const fundingRows = useMemo(
    () => (fundingResource.items || []).filter((item) => item.transaction_type === 'income'),
    [fundingResource.items],
  );

  const fundingColumns = [
    { key: 'transaction_date', label: 'Tanggal', render: (row) => formatDate(row.transaction_date) },
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
      key: 'source',
      label: 'Sumber',
      render: (row) => row.metadata?.actor_label || row.source || '-',
    },
    {
      key: 'account',
      label: 'Rekening Tagihan',
      render: (row) => row.account?.name || '-',
    },
    {
      key: 'description',
      label: 'Deskripsi',
      mobileTitle: true,
      render: (row) => row.description || row.notes || '-',
    },
    {
      key: 'amount',
      label: 'Nominal',
      render: (row) => formatCurrency(row.amount),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary-500">
          <CardContent className="space-y-1">
            <p className="text-sm text-text-muted">Dana tagihan tersedia</p>
            <p className="text-2xl font-semibold text-text-title">{formatCurrency(totalBillFunds)}</p>
            <p className="text-xs text-text-muted">Diambil dari total saldo rekening dengan klasifikasi Tagihan.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1">
            <p className="text-sm text-text-muted">Rekening tagihan aktif</p>
            <p className="text-2xl font-semibold text-text-title">{billAccounts.length}</p>
            <p className="text-xs text-text-muted">Semua rekening ini bisa menjadi tujuan alokasi dana untuk kebutuhan tagihan.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1">
            <p className="text-sm text-text-muted">Riwayat pendanaan</p>
            <p className="text-2xl font-semibold text-text-title">{fundingRows.length}</p>
            <p className="text-xs text-text-muted">Menampilkan alokasi dana dan pemasukan lain yang masuk ke rekening tagihan.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pendanaan Tagihan</CardTitle>
          <CardDescription>Data ini otomatis terisi dari fitur Alokasi Dana di menu Rekening ketika dana dikirim ke rekening dengan klasifikasi Tagihan.</CardDescription>
        </CardHeader>
        <CardContent>
          {fundingResource.isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : fundingResource.error ? (
            <ErrorState message={fundingResource.error} onRetry={fundingResource.load} />
          ) : fundingRows.length === 0 ? (
            <EmptyState
              title="Belum ada dana tagihan"
              description="Alokasikan dana ke rekening Tagihan dari menu Rekening agar riwayat pendanaan muncul di sini."
            />
          ) : (
            <DataTable columns={fundingColumns} rows={fundingRows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BillsPage() {
  return <CrudResourcePage config={configs.bills} topContent={<BillsFundingPanel />} />;
}
