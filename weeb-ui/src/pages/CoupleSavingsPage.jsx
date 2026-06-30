import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { HeartHandshake, Pencil, Plus, Settings, Trash2, UserCircle, Users, Wallet } from 'lucide-react';
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
import { refreshPageQuickly } from '../lib/pageRefresh';

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

function MobileSavingsList({ rows, partnerBySource, onAction }) {
  const [pressTimer, setPressTimer] = useState(null);
  const groupedRows = useMemo(() => {
    return rows.reduce((groups, row) => {
      const key = row.transaction_date || 'Tanpa tanggal';
      const existing = groups.find((group) => group.key === key);
      if (existing) {
        existing.rows.push(row);
      } else {
        groups.push({ key, label: key === 'Tanpa tanggal' ? key : formatDate(key), rows: [row] });
      }
      return groups;
    }, []);
  }, [rows]);

  const cancelPress = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  const startPress = (row) => {
    cancelPress();
    const timer = window.setTimeout(() => {
      onAction(row);
      setPressTimer(null);
    }, 550);
    setPressTimer(timer);
  };

  return (
    <div className="space-y-3 md:hidden">
      <div className="grid grid-cols-[44px_1fr_auto] gap-3 rounded-xl bg-surface-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        <span>No</span>
        <span>Setoran</span>
        <span className="text-right">Nominal</span>
      </div>
      {groupedRows.map((group) => (
        <div key={group.key} className="space-y-2">
          <div className="px-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{group.label}</p>
          </div>
          {group.rows.map((row, index) => {
            const actorLabel = row.metadata?.actor_label || row.source;
            const partner = partnerBySource[actorLabel];
            const senderLabel = partner ? `${partner.label} (${partner.user.name})` : actorLabel || 'Tanpa penyetor';
            const typeLabel = row.entry_type === 'account_allocation' ? 'Alokasi Dana' : 'Setoran Manual';
            const accountLabel = row.account?.name ? ` • ${row.account.name}` : '';

            return (
              <button
                key={row.id}
                type="button"
                onPointerDown={() => startPress(row)}
                onPointerUp={cancelPress}
                onPointerCancel={cancelPress}
                onPointerLeave={cancelPress}
                onContextMenu={(event) => {
                  event.preventDefault();
                  onAction(row);
                }}
                onClick={() => onAction(row)}
                className="grid min-h-[58px] w-full grid-cols-[44px_1fr_auto] items-center gap-3 rounded-xl border border-border-subtle bg-surface-panel px-3 py-3 text-left shadow-sm shadow-card-soft active:border-primary-500 active:bg-primary-500/5"
              >
                <span className="text-sm font-semibold text-text-muted">{index + 1}</span>
                <span className="min-w-0 text-sm font-medium text-text-title">
                  <span className="block truncate">{row.description || 'Setoran Tabungan Berdua'}</span>
                  <span className="mt-0.5 block text-xs font-normal text-text-muted">
                    {senderLabel} • {typeLabel}{accountLabel}
                  </span>
                </span>
                <span className="text-right text-sm font-semibold text-success-base">
                  +{formatCurrency(row.amount)}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

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
  const [actionTarget, setActionTarget] = useState(null);

  const resource = useCrudResource('/transactions', {
    transaction_type: 'income',
    account_purpose: 'couple_savings',
    per_page: 30,
  });

  const [visibleDatesCount, setVisibleDatesCount] = useState(3);

  const uniqueDates = useMemo(() => {
    const dates = new Set();
    resource.items.forEach((item) => {
      const date = item.transaction_date || 'Tanpa tanggal';
      dates.add(date);
    });
    return Array.from(dates);
  }, [resource.items]);

  const renderedItems = useMemo(() => {
    const allowedDates = new Set(uniqueDates.slice(0, visibleDatesCount));
    return resource.items.filter((item) => {
      const date = item.transaction_date || 'Tanpa tanggal';
      return allowedDates.has(date);
    });
  }, [resource.items, uniqueDates, visibleDatesCount]);

  // Reset visible dates count when params change
  useEffect(() => {
    setVisibleDatesCount(3);
  }, [resource.params]);

  // Automatically increment visible dates when new items are fetched and we had run out
  const prevUniqueDatesLengthRef = useRef(0);
  useEffect(() => {
    const prevLength = prevUniqueDatesLengthRef.current;
    const currentLength = uniqueDates.length;
    if (currentLength > prevLength && prevLength > 0 && visibleDatesCount >= prevLength) {
      setVisibleDatesCount((prev) => prev + 3);
    }
    prevUniqueDatesLengthRef.current = currentLength;
  }, [uniqueDates.length, visibleDatesCount]);

  // Handle scrolling to bottom to reveal more dates or load more pages
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;

      if (scrollTop + clientHeight >= scrollHeight - 100) {
        if (visibleDatesCount < uniqueDates.length) {
          setVisibleDatesCount((prev) => prev + 3);
        } else if (resource.meta && resource.meta.current_page < resource.meta.last_page) {
          resource.loadNextPage();
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visibleDatesCount, uniqueDates.length, resource]);

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
      refreshPageQuickly();
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
      refreshPageQuickly();
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
            </div>
          </CardContent>
        </Card>
      </div>



      {accountsLoading ? (
        <LoadingSkeleton rows={2} />
      ) : accounts.length === 0 ? (
        <EmptyState title="Belum ada rekening Tabungan berdua" description="Buat rekening baru di menu Rekening, lalu pilih klasifikasi uang Tabungan berdua agar saldo bisa ditampilkan di halaman ini." />
      ) : (
        <>
          <div className="md:hidden space-y-4 mt-2">
            <div className="px-1">
            </div>
            <div>
              {resource.isLoading ? (
                <LoadingSkeleton rows={5} />
              ) : resource.error ? (
                <ErrorState message={resource.error} onRetry={resource.load} />
              ) : resource.items.length === 0 ? (
                <EmptyState title="Belum ada setoran" description="Catat setoran pertama dari salah satu pasangan." action={<Button onClick={openCreate}>Tambah setoran</Button>} />
              ) : (
                <MobileSavingsList rows={renderedItems} partnerBySource={partnerBySource} onAction={setActionTarget} />
              )}
              {resource.isIncrementing && (
                <div className="mt-4 flex justify-center py-2">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></span>
                </div>
              )}
            </div>
          </div>

          <div className="hidden md:block">
            <Card className="overflow-visible">
              <CardHeader>
                <CardTitle>Riwayat Setoran</CardTitle>
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
          </div>
        </>
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

      <Modal
        open={Boolean(actionTarget)}
        onClose={() => setActionTarget(null)}
        title="Pilih Tindakan"
        description={actionTarget ? (actionTarget.description || 'Setoran Tabungan Berdua') : undefined}
      >
        <div className="grid gap-3 py-2">
          {actionTarget && canManageSetoran(actionTarget) ? (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  const target = actionTarget;
                  setActionTarget(null);
                  openEdit(target);
                }}
              >
                <Pencil size={18} className="mr-2" />
                Edit Setoran
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  const target = actionTarget;
                  setActionTarget(null);
                  openDelete(target);
                }}
              >
                <Trash2 size={18} className="mr-2" />
                Hapus Setoran
              </Button>
            </>
          ) : (
            <p className="text-center text-sm text-text-muted py-4">
              Setoran pasangan lain hanya bisa dilihat, tidak bisa diedit atau dihapus.
            </p>
          )}
        </div>
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
