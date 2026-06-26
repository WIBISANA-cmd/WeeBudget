import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { HeartHandshake, Plus, Settings, UserCircle, Users, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import DataTable from '../components/data/DataTable';
import EmptyState from '../components/feedback/EmptyState';
import ErrorState from '../components/feedback/ErrorState';
import LoadingSkeleton from '../components/feedback/LoadingSkeleton';
import Modal, { ConfirmDialog } from '../components/forms/Modal';
import StatusBadge from '../components/feedback/StatusBadge';
import { apiGet, apiPut } from '../api/http';
import { useCrudResource } from '../hooks/useCrudResource';
import { formatCurrency, formatDate } from '../lib/formatters';

const ResourceForm = lazy(() => import('../components/forms/ResourceForm'));

const schema = z.object({
  account_id: z.coerce.number().min(1, 'Rekening wajib dipilih'),
  amount: z.coerce.number().positive('Nominal harus lebih dari 0'),
  transaction_date: z.string().min(1, 'Tanggal wajib diisi'),
  description: z.string().optional(),
  notes: z.string().optional(),
});

const settingSchema = z.object({
  partner_one_user_id: z.coerce.number().min(1, 'Pasangan 1 wajib dipilih'),
  partner_two_user_id: z.coerce.number().min(1, 'Pasangan 2 wajib dipilih'),
}).refine((value) => value.partner_one_user_id !== value.partner_two_user_id, {
  message: 'Pasangan 1 dan pasangan 2 harus user berbeda',
  path: ['partner_two_user_id'],
});

export default function CoupleSavingsPage() {
  const [accounts, setAccounts] = useState([]);
  const [user, setUser] = useState(null);
  const [setting, setSetting] = useState(null);
  const [users, setUsers] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [settingLoading, setSettingLoading] = useState(true);
  const [isSavingSetting, setSavingSetting] = useState(false);
  const [editing, setEditing] = useState(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [isSettingOpen, setSettingOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const resource = useCrudResource('/transactions', {
    transaction_type: 'income',
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

  const loadSetting = async () => {
    setSettingLoading(true);
    try {
      const response = await apiGet('/couple-savings/setting');
      setSetting(response.data);
    } catch {
      setSetting(null);
    } finally {
      setSettingLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiGet('/users', { status: 'active', per_page: 100 });
      setUsers(response.data || []);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    queueMicrotask(loadAccounts);
    queueMicrotask(loadUser);
    queueMicrotask(loadSetting);
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      queueMicrotask(loadUsers);
    }
  }, [user?.role]);

  const totalBalance = useMemo(() => accounts.reduce((total, account) => total + Number(account.current_balance || 0), 0), [accounts]);
  const isAdmin = user?.role === 'admin';
  const partnerOne = setting?.partner_one;
  const partnerTwo = setting?.partner_two;

  const partnerBySource = useMemo(() => {
    const pairs = {};
    if (partnerOne?.email) pairs[partnerOne.email] = { label: 'Pasangan 1', user: partnerOne };
    if (partnerTwo?.email) pairs[partnerTwo.email] = { label: 'Pasangan 2', user: partnerTwo };

    return pairs;
  }, [partnerOne, partnerTwo]);

  const contributorTotals = useMemo(() => {
    return resource.items.reduce((summary, item) => {
      const source = item.source || 'Tanpa penyetor';
      const partner = partnerBySource[source];
      const key = partner?.label || source;
      const name = partner?.user?.name || source;
      const email = partner?.user?.email || source;

      summary[key] = {
        source: key,
        name,
        email,
        total: (summary[key]?.total || 0) + Number(item.amount || 0),
      };

      return summary;
    }, {});
  }, [partnerBySource, resource.items]);

  const contributors = useMemo(() => Object.values(contributorTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, 2), [contributorTotals]);

  const currentSource = user?.email || user?.name || 'Pengguna lokal';

  const accountOptions = useMemo(() => ({
    accounts: accounts.map((account) => ({
      value: account.id,
      label: `${account.name} - ${formatCurrency(account.current_balance)}`,
    })),
  }), [accounts]);

  const userOptions = useMemo(() => ({
    users: users.map((item) => ({
      value: item.id,
      label: `${item.name} - ${item.email}`,
    })),
  }), [users]);

  const settingDefaultValues = {
    partner_one_user_id: setting?.partner_one_user_id || '',
    partner_two_user_id: setting?.partner_two_user_id || '',
  };

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

  const submitSetting = async (values) => {
    setSavingSetting(true);
    try {
      const response = await apiPut('/couple-savings/setting', values);
      setSetting(response.data);
      setSettingOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Pengaturan pasangan belum bisa disimpan.');
    } finally {
      setSavingSetting(false);
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
    { key: 'entry_type', label: 'Jenis', render: (row) => (
      <StatusBadge value={row.entry_type}>
        {row.entry_type === 'account_allocation' ? 'Alokasi Dana' : 'Setoran Manual'}
      </StatusBadge>
    ) },
    { key: 'source', label: 'Penyetor', render: (row) => {
      const partner = partnerBySource[row.source];
      return <StatusBadge value="income">{partner ? `${partner.label} - ${partner.user.name}` : row.source || '-'}</StatusBadge>;
    } },
    { key: 'account', label: 'Rekening sumber saldo', render: (row) => row.account?.name || '-' },
    { key: 'description', label: 'Deskripsi', mobileTitle: true, render: (row) => (
      <div className="space-y-1">
        <p>{row.description || '-'}</p>
        {row.entry_type === 'account_allocation' && (
          <p className="text-xs text-text-muted">Transaksi ini berasal dari fitur alokasi dana antar rekening.</p>
        )}
      </div>
    ) },
    { key: 'amount', label: 'Nominal', render: (row) => formatCurrency(row.amount) },
  ];

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const canManageSetoran = (row) => Number(row.user_id) === Number(user?.id);

  const openEdit = (row) => {
    if (!canManageSetoran(row)) {
      alert('Setoran pasangan lain hanya bisa dilihat, bukan diedit.');
      return;
    }

    setEditing(row);
    setFormOpen(true);
  };

  const openDelete = (row) => {
    if (!canManageSetoran(row)) {
      alert('Setoran pasangan lain hanya bisa dilihat, bukan dihapus.');
      return;
    }

    setDeleting(row);
  };

  return (
    <div className="space-y-6 md:space-y-7">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold text-text-title md:text-3xl">Tabungan Berdua</h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Pantau kontribusi kedua pasangan, saldo rekening tabungan bersama, dan riwayat setoran dalam satu tampilan yang lebih nyaman dibaca.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Button variant="secondary" onClick={() => setSettingOpen(true)}>
              <Settings size={18} className="mr-2" />
              Atur pasangan
            </Button>
          )}
          <Button onClick={openCreate} disabled={accounts.length === 0}>
            <Plus size={18} className="mr-2" />
            Tambah setoran
          </Button>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        {[['Pasangan 1', partnerOne], ['Pasangan 2', partnerTwo]].map(([label, partner]) => (
          <Card
            key={label}
            className={partner
              ? 'border-primary-500/25 bg-gradient-to-br from-primary-500/8 via-surface-panel to-surface-panel'
              : 'border-warning-base/35 bg-gradient-to-br from-warning-base/8 via-surface-panel to-surface-panel'}
          >
            <CardContent className="flex items-center gap-4 p-5 md:p-6">
              <div className="rounded-2xl bg-surface-panel p-3 text-primary-600 shadow-sm shadow-card-soft"><HeartHandshake size={24} /></div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-muted">{label}</p>
                <p className="mt-1 truncate text-lg font-semibold text-text-title">{partner?.name || 'Belum diset'}</p>
                <p className="mt-1 truncate text-xs text-text-muted">{partner?.email || (isAdmin ? 'Klik Atur pasangan untuk memilih user.' : 'Hubungi admin untuk pengaturan pasangan.')}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.92fr_0.92fr]">
        <Card className="border-primary-500/20 bg-gradient-to-br from-primary-500/10 via-surface-panel to-surface-panel">
          <CardContent className="flex items-center gap-4 p-5 md:p-6">
            <div className="rounded-2xl bg-primary-500/12 p-3 text-primary-600"><Wallet size={24} /></div>
            <div>
              <p className="text-sm font-medium text-text-muted">Total saldo bersama</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-text-title">{formatCurrency(totalBalance)}</p>
              <p className="mt-1 text-sm text-text-muted">Sumber: saldo seluruh rekening Tabungan berdua yang aktif.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5 md:p-6">
            <div className="rounded-2xl bg-success-base/10 p-3 text-success-base"><UserCircle size={24} /></div>
            <div>
              <p className="text-sm font-medium text-text-muted">Penyetor saat ini</p>
              <p className="mt-1 text-base font-semibold text-text-title">{user?.name || 'Mode pribadi'}</p>
              <p className="mt-1 text-sm text-text-muted">{currentSource}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5 md:p-6">
            <div className="rounded-2xl bg-warning-base/10 p-3 text-warning-base"><Users size={24} /></div>
            <div>
              <p className="text-sm font-medium text-text-muted">Kontributor tercatat</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-text-title">{Object.keys(contributorTotals).length}</p>
              <p className="mt-1 text-sm text-text-muted">Sumber: pengaturan pasangan dan histori transaksi.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {contributors.length > 0 && (
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle>Ringkasan Kontribusi</CardTitle>
            <CardDescription>Diurutkan dari total setoran terbesar berdasarkan user penyetor yang tercatat otomatis.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-2">
            {contributors.map((item, index) => (
              <div key={item.source} className="rounded-[24px] border border-border-subtle bg-surface-100/80 p-5 shadow-sm shadow-card-soft">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-2xl bg-primary-500/10 p-2.5 text-primary-600">
                      {index === 0 ? <HeartHandshake size={20} /> : <Users size={20} />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text-title">{item.source} - {item.name}</p>
                      <p className="truncate text-xs text-text-muted">{item.email}</p>
                    </div>
                  </div>
                  <StatusBadge value="active">Penyetor</StatusBadge>
                </div>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-text-title">{formatCurrency(item.total)}</p>
                <p className="mt-1 text-sm text-text-muted">Sumber: total transaksi milik penyetor ini.</p>
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
        <Card className="overflow-visible">
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
              <DataTable columns={columns} rows={resource.items} onEdit={openEdit} onDelete={openDelete} />
            )}
          </CardContent>
        </Card>
      )}

      <Modal
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit setoran' : 'Tambah setoran'}
        description="Setoran dicatat sebagai transaksi pemasukan ke rekening Tabungan berdua."
        fullScreenOnMobile={true}
      >
        <Suspense fallback={<LoadingSkeleton rows={4} />}>
          <ResourceForm
            schema={schema}
            fields={fields}
            defaultValues={defaultValues}
            options={accountOptions}
            isSaving={resource.isSaving}
            submitLabel={editing ? 'Simpan perubahan' : 'Simpan setoran'}
            onSubmit={submit}
          />
        </Suspense>
      </Modal>

      <Modal
        open={isSettingOpen}
        onClose={() => setSettingOpen(false)}
        title="Atur pasangan"
        fullScreenOnMobile={true}
      >
        {settingLoading ? (
          <LoadingSkeleton rows={3} />
        ) : (
          <Suspense fallback={<LoadingSkeleton rows={3} />}>
            <ResourceForm
              schema={settingSchema}
              fields={[
                { name: 'partner_one_user_id', label: 'Pasangan 1', type: 'select', optionsKey: 'users' },
                { name: 'partner_two_user_id', label: 'Pasangan 2', type: 'select', optionsKey: 'users' },
              ]}
              defaultValues={settingDefaultValues}
              options={userOptions}
              isSaving={isSavingSetting}
              submitLabel="Simpan pasangan"
              onSubmit={submitSetting}
            />
          </Suspense>
        )}
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
