import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { Plus, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DataTable from '../../components/data/DataTable';
import EmptyState from '../../components/feedback/EmptyState';
import ErrorState from '../../components/feedback/ErrorState';
import LoadingSkeleton from '../../components/feedback/LoadingSkeleton';
import Modal, { ConfirmDialog } from '../../components/forms/Modal';
import ResourceForm from '../../components/forms/ResourceForm';
import StatusBadge from '../../components/feedback/StatusBadge';
import { apiGet } from '../../api/http';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { useCrudResource } from '../../hooks/useCrudResource';

const transactionSchema = z.object({
  account_id: z.coerce.number().min(1, 'Rekening wajib dipilih'),
  amount: z.coerce.number().positive('Nominal harus lebih dari 0'),
  transaction_date: z.string().min(1, 'Tanggal wajib diisi'),
  description: z.string().optional(),
  notes: z.string().optional(),
});

export default function AccountPurposeTransactionsPage({
  title,
  description,
  purpose,
  createLabel,
  emptyTitle,
  emptyDescription,
  needType = 'saving',
  typeLabel = 'Tabungan',
}) {
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const resource = useCrudResource('/transactions', {
    transaction_type: 'income',
    need_type: needType,
    account_purpose: purpose,
    per_page: 50,
  });

  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const response = await apiGet('/accounts', { purpose, is_active: true, per_page: 100 });
      setAccounts(response.data || []);
    } catch {
      setAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  }, [purpose]);

  useEffect(() => {
    queueMicrotask(loadAccounts);
  }, [loadAccounts]);

  const totalBalance = useMemo(() => {
    return accounts.reduce((total, account) => total + Number(account.current_balance || 0), 0);
  }, [accounts]);

  const accountOptions = useMemo(() => ({
    accounts: accounts.map((account) => ({
      value: account.id,
      label: `${account.name} - ${formatCurrency(account.current_balance)}`,
    })),
  }), [accounts]);

  const defaultValues = editing ? {
    account_id: editing.account_id || '',
    amount: editing.amount || '',
    transaction_date: editing.transaction_date || new Date().toISOString().slice(0, 10),
    description: editing.description || '',
    notes: editing.notes || '',
  } : {
    account_id: accounts[0]?.id || '',
    amount: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    description: '',
    notes: '',
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormOpen(true);
  };

  const submit = async (values) => {
    const result = await resource.save({
      ...values,
      transaction_type: 'income',
      need_type: needType,
      source: purpose,
    }, editing?.id);

    if (result.ok) {
      setFormOpen(false);
      setEditing(null);
      await loadAccounts();
    } else {
      alert(result.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await resource.remove(deleting.id);
    setDeleting(null);
    await loadAccounts();
  };

  const fields = [
    { name: 'account_id', label: 'Rekening tujuan', type: 'select', optionsKey: 'accounts' },
    { name: 'amount', label: 'Nominal', type: 'number', valueAsNumber: true },
    { name: 'transaction_date', label: 'Tanggal transaksi', type: 'date' },
    { name: 'description', label: 'Deskripsi', full: true },
    { name: 'notes', label: 'Catatan', type: 'textarea', full: true },
  ];

  const columns = [
    { key: 'transaction_date', label: 'Tanggal', render: (row) => formatDate(row.transaction_date) },
    { key: 'description', label: 'Deskripsi', render: (row) => row.description || '-' },
    { key: 'account', label: 'Rekening', render: (row) => row.account?.name || '-' },
    { key: 'amount', label: 'Nominal', render: (row) => formatCurrency(row.amount) },
    { key: 'need_type', label: 'Jenis', render: () => <StatusBadge value={needType}>{typeLabel}</StatusBadge> },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-title md:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">{description}</p>
        </div>
        <Button onClick={openCreate} disabled={accounts.length === 0}>
          <Plus size={18} className="mr-2" />
          {createLabel}
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="rounded-xl bg-primary-500/10 p-3 text-primary-600">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-sm text-text-muted">Total saldo {title}</p>
              <p className="mt-1 text-2xl font-semibold text-text-title">{formatCurrency(totalBalance)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-text-muted">Rekening aktif</p>
            <p className="mt-2 text-2xl font-semibold text-primary-600">{accounts.length}</p>
          </CardContent>
        </Card>
      </div>

      {accountsLoading ? (
        <LoadingSkeleton rows={2} />
      ) : accounts.length === 0 ? (
        <EmptyState title="Belum ada rekening tujuan" description={`Buat rekening dengan klasifikasi uang ${title} sebelum mencatat transaksi.`} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Transaksi {title}</CardTitle>
            <CardDescription>Setiap penambahan dicatat sebagai transaksi dan memperbarui saldo rekening tujuan.</CardDescription>
          </CardHeader>
          <CardContent>
            {resource.isLoading ? (
              <LoadingSkeleton rows={5} />
            ) : resource.error ? (
              <ErrorState message={resource.error} onRetry={resource.load} />
            ) : resource.items.length === 0 ? (
              <EmptyState title={emptyTitle} description={emptyDescription} action={<Button onClick={openCreate}>{createLabel}</Button>} />
            ) : (
              <DataTable columns={columns} rows={resource.items} onEdit={openEdit} onDelete={setDeleting} />
            )}
          </CardContent>
        </Card>
      )}

      <Modal
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit transaksi ${title}` : createLabel}
        description={`Catat nominal masuk ke rekening ${title}.`}
      >
        <ResourceForm
          schema={transactionSchema}
          fields={fields}
          defaultValues={defaultValues}
          options={accountOptions}
          isSaving={resource.isSaving}
          submitLabel={editing ? 'Simpan perubahan' : 'Simpan transaksi'}
          onSubmit={submit}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus transaksi?"
        description="Saldo rekening akan disesuaikan kembali setelah transaksi dihapus."
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
