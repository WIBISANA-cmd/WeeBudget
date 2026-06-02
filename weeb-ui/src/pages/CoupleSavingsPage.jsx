import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { HeartHandshake, Plus, UserCircle, Users, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import DataTable from '../components/data/DataTable';
import EmptyState from '../components/feedback/EmptyState';
import ErrorState from '../components/feedback/ErrorState';
import LoadingSkeleton from '../components/feedback/LoadingSkeleton';
import Modal, { ConfirmDialog } from '../components/forms/Modal';
import ResourceForm from '../components/forms/ResourceForm';
import StatusBadge from '../components/feedback/StatusBadge';
import { apiGet } from '../api/http';
import { useCrudResource } from '../hooks/useCrudResource';
import { formatCurrency, formatDate } from '../lib/formatters';

const schema = z.object({
  account_id: z.coerce.number().min(1, 'Rekening wajib dipilih'),
  amount: z.coerce.number().positive('Nominal harus lebih dari 0'),
  transaction_date: z.string().min(1, 'Tanggal wajib diisi'),
  description: z.string().optional(),
  notes: z.string().optional(),
});

export default function CoupleSavingsPage() {
  const [accounts, setAccounts] = useState([]);
  const [user, setUser] = useState(null);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const resource = useCrudResource('/transactions', {
    transaction_type: 'income',
    need_type: 'saving',
    account_purpose: 'couple_savings',
    per_page: 100,
  });

  const loadAccounts = async () => {
    setAccountsLoading(true);
    try {
      const response = await apiGet('/accounts', { purpose: 'couple_savings', is_active: true, per_page: 100 });
      setAccounts(response.data || []);
    } catch {
      setAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  };

  const loadUser = async () => {
    try {
      const response = await apiGet('/auth/me');
      setUser(response.data);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    queueMicrotask(loadAccounts);
    queueMicrotask(loadUser);
  }, []);

  const totalBalance = useMemo(() => accounts.reduce((total, account) => total + Number(account.current_balance || 0), 0), [accounts]);

  const contributorTotals = useMemo(() => {
    return resource.items.reduce((summary, item) => {
      const source = item.source || 'Tanpa penyetor';
      summary[source] = (summary[source] || 0) + Number(item.amount || 0);
      return summary;
    }, {});
  }, [resource.items]);

  const contributors = useMemo(() => Object.entries(contributorTotals)
    .map(([source, total]) => ({ source, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 2), [contributorTotals]);

  const currentSource = user?.email || user?.name || 'Pengguna lokal';

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

  const submit = async (values) => {
    const result = await resource.save({
      ...values,
      source: currentSource,
      transaction_type: 'income',
      need_type: 'saving',
      description: values.description || `Setoran tabungan berdua - ${user?.name || currentSource}`,
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
    { name: 'account_id', label: 'Rekening tabungan berdua', type: 'select', optionsKey: 'accounts' },
    { name: 'amount', label: 'Nominal setoran', type: 'number', valueAsNumber: true },
    { name: 'transaction_date', label: 'Tanggal transaksi', type: 'date' },
    { name: 'description', label: 'Deskripsi', full: true },
    { name: 'notes', label: 'Catatan', type: 'textarea', full: true },
  ];

  const columns = [
    { key: 'transaction_date', label: 'Tanggal', render: (row) => formatDate(row.transaction_date) },
    { key: 'source', label: 'Penyetor', render: (row) => <StatusBadge value="income">{row.source || '-'}</StatusBadge> },
    { key: 'account', label: 'Rekening sumber saldo', render: (row) => row.account?.name || '-' },
    { key: 'description', label: 'Deskripsi', render: (row) => row.description || '-' },
    { key: 'amount', label: 'Nominal', render: (row) => formatCurrency(row.amount) },
  ];

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-title md:text-3xl">Tabungan Berdua</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
            Pendataan setoran dari dua pasangan. Penyetor otomatis mengikuti user yang sedang login; total saldo berasal dari rekening berklasifikasi Tabungan berdua.
          </p>
        </div>
        <Button onClick={openCreate} disabled={accounts.length === 0}>
          <Plus size={18} className="mr-2" />
          Tambah setoran
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="rounded-xl bg-primary-500/10 p-3 text-primary-600"><Wallet size={24} /></div>
            <div>
              <p className="text-sm text-text-muted">Total saldo</p>
              <p className="mt-1 text-2xl font-semibold text-text-title">{formatCurrency(totalBalance)}</p>
              <p className="mt-1 text-xs text-text-muted">Sumber: saldo rekening Tabungan berdua</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="rounded-xl bg-success-base/10 p-3 text-success-base"><UserCircle size={24} /></div>
            <div>
              <p className="text-sm text-text-muted">Penyetor saat ini</p>
              <p className="mt-1 text-base font-semibold text-text-title">{user?.name || 'Mode pribadi'}</p>
              <p className="mt-1 text-xs text-text-muted">{currentSource}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="rounded-xl bg-warning-base/10 p-3 text-warning-base"><Users size={24} /></div>
            <div>
              <p className="text-sm text-text-muted">Kontributor tercatat</p>
              <p className="mt-1 text-2xl font-semibold text-text-title">{Object.keys(contributorTotals).length}</p>
              <p className="mt-1 text-xs text-text-muted">Sumber: field penyetor pada transaksi</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {contributors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Kontribusi</CardTitle>
            <CardDescription>Diurutkan dari total setoran terbesar berdasarkan user penyetor yang tercatat otomatis.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {contributors.map((item, index) => (
              <div key={item.source} className="rounded-2xl border border-border-subtle bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-xl bg-primary-500/10 p-2 text-primary-600">
                      {index === 0 ? <HeartHandshake size={20} /> : <Users size={20} />}
                    </div>
                    <p className="truncate font-semibold text-text-title">{item.source}</p>
                  </div>
                  <StatusBadge value="active">Penyetor</StatusBadge>
                </div>
                <p className="mt-4 text-2xl font-semibold text-text-title">{formatCurrency(item.total)}</p>
                <p className="mt-1 text-xs text-text-muted">Sumber: total transaksi milik penyetor ini</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {accountsLoading ? (
        <LoadingSkeleton rows={2} />
      ) : accounts.length === 0 ? (
        <EmptyState title="Belum ada rekening Tabungan berdua" description="Buat rekening baru di menu Rekening, lalu pilih klasifikasi uang Tabungan berdua agar saldo bisa ditampilkan di halaman ini." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Setoran</CardTitle>
            <CardDescription>Data kontribusi diambil dari transaksi pemasukan yang masuk ke rekening Tabungan berdua.</CardDescription>
          </CardHeader>
          <CardContent>
            {resource.isLoading ? (
              <LoadingSkeleton rows={5} />
            ) : resource.error ? (
              <ErrorState message={resource.error} onRetry={resource.load} />
            ) : resource.items.length === 0 ? (
              <EmptyState title="Belum ada setoran" description="Catat setoran pertama dari salah satu pasangan." action={<Button onClick={openCreate}>Tambah setoran</Button>} />
            ) : (
              <DataTable columns={columns} rows={resource.items} onEdit={(row) => { setEditing(row); setFormOpen(true); }} onDelete={setDeleting} />
            )}
          </CardContent>
        </Card>
      )}

      <Modal
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit setoran' : 'Tambah setoran'}
        description="Setoran dicatat sebagai transaksi pemasukan ke rekening Tabungan berdua."
      >
        <ResourceForm
          schema={schema}
          fields={fields}
          defaultValues={defaultValues}
          options={accountOptions}
          isSaving={resource.isSaving}
          submitLabel={editing ? 'Simpan perubahan' : 'Simpan setoran'}
          onSubmit={submit}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus setoran?"
        description="Saldo rekening akan disesuaikan kembali setelah transaksi dihapus."
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
