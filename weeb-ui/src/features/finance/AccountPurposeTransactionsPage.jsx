import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { Eye, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
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
import { useCategoryOptions } from '../../hooks/useCategoryOptions';

const transactionSchema = z.object({
  account_id: z.coerce.number().min(1, 'Rekening wajib dipilih'),
  category_id: z.coerce.number().optional().or(z.literal('')),
  amount: z.coerce.number().positive('Nominal harus lebih dari 0'),
  transaction_date: z.string().min(1, 'Tanggal wajib diisi'),
  description: z.string().optional(),
});

const needsByCategory = {
  Tabungan: ['Tabungan rutin', 'Target tabungan', 'Dana masa depan', 'Sisa uang aman'],
  'Dana Darurat': ['Dana darurat bulanan', 'Cadangan kesehatan', 'Cadangan keluarga', 'Cadangan tak terduga'],
  Jajan: ['Wishlist pribadi', 'Hadiah', 'Self reward'],
  Hiburan: ['Liburan', 'Hobi', 'Tiket/acara'],
  Lainnya: ['Kebutuhan lain', 'Alokasi khusus'],
};

function getNeedLabel(row) {
  return row.description || row.category?.name || '-';
}

function isIncome(row) {
  return row.transaction_type !== 'expense';
}

function signedAmount(row) {
  return `${isIncome(row) ? '+' : '-'}${formatCurrency(row.amount)}`;
}

function amountClass(row) {
  return isIncome(row) ? 'text-success-base' : 'text-danger-base';
}

function MobileTransactionList({ rows, onAction }) {
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
        <span>Kebutuhan</span>
        <span className="text-right">Nominal</span>
      </div>
      {groupedRows.map((group) => (
        <div key={group.key} className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-text-muted">{group.label}</p>
          {group.rows.map((row, index) => (
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
              className="grid min-h-[58px] w-full grid-cols-[44px_1fr_auto] items-center gap-3 rounded-xl border border-border-subtle bg-surface-panel px-3 py-3 text-left shadow-sm shadow-card-soft active:border-primary-500 active:bg-primary-500/5"
            >
              <span className="text-sm font-semibold text-text-muted">{index + 1}</span>
              <span className="min-w-0 text-sm font-medium text-text-title">
                <span className="block truncate">{getNeedLabel(row)}</span>
              </span>
              <span className={`text-right text-sm font-semibold ${amountClass(row)}`}>{signedAmount(row)}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

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
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [actionTarget, setActionTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const categoryOptions = useCategoryOptions();

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

  const selectedAccount = useMemo(() => {
    return accounts.find((account) => String(account.id) === String(selectedAccountId)) || accounts[0] || null;
  }, [accounts, selectedAccountId]);

  const totalBalance = useMemo(() => {
    return Number(selectedAccount?.current_balance || 0);
  }, [selectedAccount]);

  const filteredRows = useMemo(() => {
    if (!selectedAccount) return [];
    return resource.items.filter((item) => String(item.account_id) === String(selectedAccount.id));
  }, [resource.items, selectedAccount]);

  const formOptions = useMemo(() => {
    const categories = categoryOptions.categories.filter((category) => {
      const isRelevantType = category.type === 'income' || category.type === 'expense' || category.type === 'both';
      const isRelevantNeed = !category.needType || category.needType === needType || (needType === 'saving' && category.needType === 'saving');
      return isRelevantType && isRelevantNeed;
    });

    return {
      categories,
      needs: categories.flatMap((category) => {
        const mappedNeeds = needsByCategory[category.label] || [category.label];
        return mappedNeeds.map((need) => ({
          value: need,
          label: need,
          categoryId: category.value,
        }));
      }),
    };
  }, [categoryOptions.categories, needType]);

  const defaultValues = editing ? {
    account_id: editing.account_id || '',
    category_id: editing.category_id || '',
    amount: editing.amount || '',
    transaction_date: editing.transaction_date || new Date().toISOString().slice(0, 10),
    description: editing.description || '',
  } : {
    account_id: selectedAccount?.id || '',
    category_id: formOptions.categories[0]?.value || '',
    amount: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    description: '',
  };

  const openCreate = () => {
    setEditing(null);
    if (selectedAccount) setSelectedAccountId(selectedAccount.id);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setSelectedAccountId(row.account_id);
    setActionTarget(null);
    setFormOpen(true);
  };

  const openDetail = (row) => {
    setDetailTarget(row);
    setActionTarget(null);
  };

  const openDelete = (row) => {
    setDeleting(row);
    setActionTarget(null);
  };

  const submit = async (values) => {
    const result = await resource.save({
      ...values,
      account_id: editing?.account_id || selectedAccount?.id || values.account_id,
      category_id: values.category_id || null,
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
    { name: 'account_id', type: 'hidden' },
    { name: 'category_id', label: 'Kategori', type: 'select', optionsKey: 'categories', clearFieldsOnChange: ['description'] },
    {
      name: 'description',
      label: 'Kebutuhan',
      type: 'select',
      optionsKey: 'needs',
      getOptions: ({ options, values }) => options.filter((option) => String(option.categoryId) === String(values?.category_id || '')),
    },
    { name: 'amount', label: 'Nominal', type: 'number', valueAsNumber: true },
    { name: 'transaction_date', label: 'Tanggal transaksi', type: 'date' },
  ];

  const columns = [
    { key: 'transaction_date', label: 'Tanggal', render: (row) => formatDate(row.transaction_date) },
    { key: 'description', label: 'Kebutuhan', mobileTitle: true, render: (row) => getNeedLabel(row) },
    { key: 'account', label: 'Rekening', render: (row) => row.account?.name || '-' },
    { key: 'amount', label: 'Nominal', render: (row) => <span className={amountClass(row)}>{signedAmount(row)}</span> },
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
              <p className="text-sm text-text-muted">Total saldo {selectedAccount?.name || title}</p>
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
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => setSelectedAccountId(account.id)}
                  className={`shrink-0 rounded-xl border px-4 py-2 text-left text-sm transition-colors ${
                    String(selectedAccount?.id) === String(account.id)
                      ? 'border-primary-500 bg-primary-500 text-white shadow-sm shadow-primary-500/20'
                      : 'border-border-subtle bg-surface-panel text-text-body hover:border-primary-500 hover:text-primary-600'
                  }`}
                >
                  <span className="block font-semibold">{account.name}</span>
                  <span className="block text-xs opacity-80">{formatCurrency(account.current_balance)}</span>
                </button>
              ))}
            </div>
            {resource.isLoading ? (
              <LoadingSkeleton rows={5} />
            ) : resource.error ? (
              <ErrorState message={resource.error} onRetry={resource.load} />
            ) : filteredRows.length === 0 ? (
              <EmptyState title={emptyTitle} description={emptyDescription} action={<Button onClick={openCreate}>{createLabel}</Button>} />
            ) : (
              <>
                <MobileTransactionList rows={filteredRows} onAction={setActionTarget} />
                <div className="hidden md:block">
                  <DataTable columns={columns} rows={filteredRows} onEdit={openEdit} onDelete={setDeleting} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Modal
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit transaksi ${title}` : createLabel}
        description={`Catat nominal masuk ke rekening ${title}.`}
        fullScreenOnMobile={true}
      >
        <ResourceForm
          schema={transactionSchema}
          fields={fields}
          defaultValues={defaultValues}
          options={formOptions}
          isSaving={resource.isSaving}
          submitLabel={editing ? 'Simpan perubahan' : 'Simpan transaksi'}
          onSubmit={submit}
        />
      </Modal>

      <Modal
        open={Boolean(detailTarget)}
        onClose={() => setDetailTarget(null)}
        title="Detail transaksi"
        description={detailTarget ? getNeedLabel(detailTarget) : ''}
      >
        {detailTarget && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><span className="text-text-muted">Rekening</span><span className="font-semibold text-text-title">{detailTarget.account?.name || '-'}</span></div>
            <div className="flex justify-between gap-4"><span className="text-text-muted">Kategori</span><span className="font-semibold text-text-title">{detailTarget.category?.name || '-'}</span></div>
            <div className="flex justify-between gap-4"><span className="text-text-muted">Nominal</span><span className={`font-semibold ${amountClass(detailTarget)}`}>{signedAmount(detailTarget)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-text-muted">Tanggal</span><span className="font-semibold text-text-title">{formatDate(detailTarget.transaction_date)}</span></div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(actionTarget)}
        onClose={() => setActionTarget(null)}
        title="Aksi transaksi"
        description={actionTarget ? getNeedLabel(actionTarget) : ''}
      >
        <div className="grid gap-3">
          <Button variant="secondary" onClick={() => openDetail(actionTarget)}><Eye size={18} className="mr-2" />Detail</Button>
          <Button variant="secondary" onClick={() => openEdit(actionTarget)}><Pencil size={18} className="mr-2" />Edit</Button>
          <Button variant="danger" onClick={() => openDelete(actionTarget)}><Trash2 size={18} className="mr-2" />Hapus</Button>
        </div>
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
