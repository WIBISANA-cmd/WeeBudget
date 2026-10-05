import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { ChevronRight, Plus } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DataTable, { DataTableSkeleton } from '../../components/data/DataTable';
import EmptyState from '../../components/feedback/EmptyState';
import ErrorState from '../../components/feedback/ErrorState';
import { ChipRowSkeleton, FormSkeleton, Skeleton } from '../../components/feedback/LoadingSkeleton';
import Modal, { ConfirmDialog, DetailActions } from '../../components/forms/Modal';
import StatusBadge from '../../components/feedback/StatusBadge';
import { apiGet } from '../../api/http';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { useCrudResource } from '../../hooks/useCrudResource';
import { useCategoryOptions } from '../../hooks/useCategoryOptions';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { cn } from '../../lib/utils';

const ResourceForm = lazy(lazyWithRetry(() => import('../../components/forms/ResourceForm'), 'ResourceForm'));

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

const mobileListClass = 'overflow-hidden rounded-2xl border border-border-subtle bg-surface-panel md:hidden';
const mobileGroupClass = 'bg-surface-100 px-3 py-2 text-xs font-semibold text-text-title';
const mobileRowClass = 'row-press flex min-h-[56px] w-full items-center gap-3 px-3 py-2.5 text-left';
const chipClass = 'shrink-0 rounded-xl border px-4 py-2 text-left text-sm transition-colors';

function getNeedLabel(row) {
  return row.description || row.category?.name || '-';
}

function isIncome(row) {
  return row.transaction_type !== 'expense';
}

function isAllocation(row) {
  return row.entry_type === 'account_allocation';
}

function signedAmount(row) {
  return `${isIncome(row) ? '+' : '-'}${formatCurrency(row.amount)}`;
}

function amountClass(row) {
  return isIncome(row) ? 'text-success-base' : 'text-danger-base';
}

const columns = [
  { key: 'transaction_date', label: 'Tanggal', render: (row) => formatDate(row.transaction_date) },
  { key: 'description', label: 'Kebutuhan', mobileTitle: true, render: (row) => getNeedLabel(row) },
  {
    key: 'entry_type',
    label: 'Sumber',
    render: (row) => (
      <StatusBadge value={isAllocation(row) ? 'account_allocation' : 'income'}>
        {isAllocation(row) ? 'Alokasi Dana' : 'Setoran Manual'}
      </StatusBadge>
    ),
  },
  { key: 'amount', label: 'Nominal', render: (row) => <span className={cn('font-semibold tabular-nums', amountClass(row))}>{signedAmount(row)}</span> },
];

function MobileTransactionList({ rows, onAction }) {
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

  return (
    <div className={mobileListClass}>
      {groupedRows.map((group) => (
        <div key={group.key} className="divide-y divide-border-subtle border-b border-border-subtle last:border-b-0">
          <p className={mobileGroupClass}>{group.label}</p>
          {group.rows.map((row) => (
            // A tap opens the detail, where edit and delete live.
            <button key={row.id} type="button" onClick={() => onAction(row)} className={mobileRowClass}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-text-title">{getNeedLabel(row)}</span>
                <span className="mt-0.5 block truncate text-xs text-text-muted">{isAllocation(row) ? 'Alokasi Dana' : 'Setoran Manual'}</span>
              </span>
              <span className={cn('shrink-0 text-sm font-semibold tabular-nums', amountClass(row))}>{signedAmount(row)}</span>
              <ChevronRight size={16} className="shrink-0 text-text-muted" />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/** The transaction list while it loads: grouped mobile rows, and the real table grid on desktop. */
function TransactionsSkeleton() {
  return (
    <>
      <div className={mobileListClass}>
        {[['w-32', 'w-40', 'w-28'], ['w-36', 'w-24']].map((widths, groupIndex) => (
          <div key={groupIndex} className="divide-y divide-border-subtle border-b border-border-subtle last:border-b-0">
            <div className={mobileGroupClass}><Skeleton className="h-3.5 w-24" /></div>
            {widths.map((width, index) => (
              <div key={index} className={mobileRowClass}>
                <div className="min-w-0 flex-1">
                  <Skeleton className={cn('h-3.5', width)} />
                  <Skeleton className="mt-2 h-3 w-24" />
                </div>
                <Skeleton className="h-3.5 w-24 shrink-0" />
                <Skeleton className="h-4 w-4 shrink-0 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="hidden md:block">
        <DataTableSkeleton columns={columns} rows={5} grouped />
      </div>
    </>
  );
}

export default function AccountPurposeTransactionsPage({
  title,
  purpose,
  createLabel,
  emptyTitle,
  emptyDescription,
  needType = 'saving',
  headerExtra = null,
}) {
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState('');
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

  useEffect(() => {
    if (accounts.length === 0) {
      return;
    }

    const hasSelectedAccount = accounts.some((account) => String(account.id) === String(selectedAccountId));
    if (hasSelectedAccount) {
      return;
    }

    const latestTransactionAccountId = resource.items.find((item) => (
      accounts.some((account) => String(account.id) === String(item.account_id))
    ))?.account_id;

    setSelectedAccountId(latestTransactionAccountId || accounts[0]?.id || '');
  }, [accounts, resource.items, selectedAccountId]);

  const totalBalance = useMemo(
    () => accounts.reduce((total, account) => total + Number(account.current_balance || 0), 0),
    [accounts],
  );

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
    setDetailTarget(null);
    setFormOpen(true);
  };

  const openDelete = (row) => {
    setDeleting(row);
    setDetailTarget(null);
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

  const isFirstLoad = accountsLoading && accounts.length === 0;

  return (
    <div className="space-y-3 md:space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-text-title md:text-2xl">{title}</h1>
        <div className="flex flex-wrap items-center gap-2 max-md:w-full max-md:*:flex-1">
          {headerExtra}
          <Button onClick={openCreate} disabled={accounts.length === 0}>
            <Plus size={18} className="mr-2" />
            {createLabel}
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-text-muted">Total saldo</p>
            {isFirstLoad
              ? <Skeleton className="mt-2 h-8 w-48" />
              : <p className="mt-1 font-outfit text-3xl font-semibold tabular-nums text-text-title">{formatCurrency(totalBalance)}</p>}
          </div>

          {/* One chip per account: picking one scopes the list below to it. */}
          {isFirstLoad ? <ChipRowSkeleton count={2} /> : accounts.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {accounts.map((account) => {
                const isSelected = String(selectedAccount?.id) === String(account.id);

                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => setSelectedAccountId(account.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      chipClass,
                      isSelected
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : 'border-border-subtle bg-surface-panel text-text-body hover:border-border-strong hover:text-primary-600',
                    )}
                  >
                    <span className="block font-semibold">{account.name}</span>
                    <span className="block text-xs tabular-nums">{formatCurrency(account.current_balance)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div key={isFirstLoad || resource.isLoading ? 'loading' : 'ready'} className="page-fade-in">
      {isFirstLoad || resource.isLoading ? (
        <TransactionsSkeleton />
      ) : accounts.length === 0 ? (
        <EmptyState title="Belum ada rekening tujuan" description={`Buat rekening dengan klasifikasi ${title} di menu Rekening sebelum mencatat transaksi.`} />
      ) : resource.error ? (
        <ErrorState message={resource.error} onRetry={() => resource.load()} />
      ) : filteredRows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={<Button onClick={openCreate}>{createLabel}</Button>} />
      ) : (
        <>
          <MobileTransactionList rows={filteredRows} onAction={setDetailTarget} />
          <div className="hidden md:block">
            <DataTable columns={columns} rows={filteredRows} onEdit={openEdit} onDelete={openDelete} />
          </div>
        </>
      )}
      </div>

      <Modal
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit transaksi ${title}` : createLabel}
        fullScreenOnMobile={true}
      >
        <Suspense fallback={<FormSkeleton fields={4} />}>
          <ResourceForm
            schema={transactionSchema}
            fields={fields}
            defaultValues={defaultValues}
            options={formOptions}
            isSaving={resource.isSaving}
            submitLabel={editing ? 'Simpan perubahan' : 'Simpan transaksi'}
            onSubmit={submit}
          />
        </Suspense>
      </Modal>

      <Modal
        open={Boolean(detailTarget)}
        onClose={() => setDetailTarget(null)}
        title={detailTarget ? getNeedLabel(detailTarget) : 'Detail transaksi'}
        footer={detailTarget && (
          <DetailActions onEdit={() => openEdit(detailTarget)} onDelete={() => openDelete(detailTarget)} />
        )}
      >
        {detailTarget && (
          <dl className="divide-y divide-border-subtle text-sm">
            {[
              ['Rekening', detailTarget.account?.name || '-'],
              ['Kategori', detailTarget.category?.name || '-'],
              ['Tanggal', formatDate(detailTarget.transaction_date)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2.5">
                <dt className="text-text-muted">{label}</dt>
                <dd className="font-semibold text-text-title">{value}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-text-muted">Nominal</dt>
              <dd className={cn('font-semibold tabular-nums', amountClass(detailTarget))}>{signedAmount(detailTarget)}</dd>
            </div>
          </dl>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus transaksi?"
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
