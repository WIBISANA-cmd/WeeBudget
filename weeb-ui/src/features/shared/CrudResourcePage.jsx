import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Plus } from 'lucide-react';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/layout/PageHeader';
import DataTable, { DataTableSkeleton } from '../../components/data/DataTable';
import EmptyState from '../../components/feedback/EmptyState';
import ErrorState from '../../components/feedback/ErrorState';
import { FormSkeleton, Skeleton } from '../../components/feedback/LoadingSkeleton';
import Modal, { ConfirmDialog, DetailActions } from '../../components/forms/Modal';
import { useCrudResource } from '../../hooks/useCrudResource';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import { lazyWithRetry } from '../../lib/lazyWithRetry';

const ResourceForm = lazy(lazyWithRetry(() => import('../../components/forms/ResourceForm'), 'ResourceForm'));

const mobileListClass = 'overflow-hidden rounded-2xl border border-border-subtle bg-surface-panel md:hidden';
const mobileGroupClass = 'flex items-center justify-between gap-3 bg-surface-100 px-3 py-2 text-xs';
const mobileRowClass = 'row-press flex min-h-[56px] w-full items-center gap-3 px-3 py-2.5 text-left';

function MobileResourceList({ rows, columns, onAction }) {
  const groupedRows = useMemo(() => {
    return rows.reduce((groups, row) => {
      const key = columns.dateKey ? columns.dateKey(row) : row.transaction_date || row.date || 'Tanpa tanggal';
      const existing = groups.find((group) => group.key === key);
      if (existing) {
        existing.rows.push(row);
      } else {
        // Undated resources (accounts) opt out of grouping with dateKey: () => '' — no header.
        groups.push({ key, label: !key ? '' : key === 'Tanpa tanggal' ? key : formatDate(key), rows: [row] });
      }
      return groups;
    }, []);
  }, [columns, rows]);

  return (
    <div className={mobileListClass}>
      {groupedRows.map((group) => (
        <div key={group.key} className="divide-y divide-border-subtle border-b border-border-subtle last:border-b-0">
          {(group.label || columns.groupSummary) && (
            <div className={mobileGroupClass}>
              <span className="font-semibold text-text-title">{group.label}</span>
              {columns.groupSummary && (
                <span className="flex flex-wrap justify-end gap-x-3 text-text-muted">
                  {columns.groupSummary(group.rows).map((item) => (
                    <span key={item.label}>{item.label} <span className="font-semibold text-text-body">{item.value}</span></span>
                  ))}
                </span>
              )}
            </div>
          )}
          {group.rows.map((row) => (
            // A tap opens the detail, where edit and delete live.
            <button key={row.id} type="button" onClick={() => onAction(row)} className={mobileRowClass}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-text-title">{columns.title(row)}</span>
                {columns.subtitle && <span className="mt-0.5 block truncate text-xs text-text-muted">{columns.subtitle(row)}</span>}
              </span>
              <span className={cn('shrink-0 text-right text-sm font-semibold tabular-nums', columns.amountClass ? columns.amountClass(row) : 'text-text-title')}>
                {columns.amount(row)}
              </span>
              <ChevronRight size={16} className="shrink-0 text-text-muted" />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Same frame, group header and row anatomy as MobileResourceList. */
function MobileResourceListSkeleton({ columns }) {
  const grouped = !columns.dateKey || Boolean(columns.groupSummary);
  const groups = grouped ? [['w-40', 'w-28', 'w-36'], ['w-32', 'w-44']] : [['w-28', 'w-36', 'w-24', 'w-32', 'w-40']];

  return (
    <div className={mobileListClass}>
      {groups.map((widths, groupIndex) => (
        <div key={groupIndex} className="divide-y divide-border-subtle border-b border-border-subtle last:border-b-0">
          {grouped && (
            <div className={mobileGroupClass}>
              <Skeleton className="h-3.5 w-24" />
              {columns.groupSummary && <Skeleton className="h-3.5 w-40" />}
            </div>
          )}
          {widths.map((width, index) => (
            <div key={index} className={mobileRowClass}>
              <div className="min-w-0 flex-1">
                <Skeleton className={cn('h-3.5 max-w-full', width)} />
                {columns.subtitle && <Skeleton className="mt-2 h-3 w-24" />}
              </div>
              <Skeleton className="h-3.5 w-24 shrink-0" />
              <Skeleton className="h-4 w-4 shrink-0 rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function CrudResourcePage({ config, options = {}, topContent = null, bottomContent = null, headerActions = null }) {
  const [editing, setEditing] = useState(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const resource = useCrudResource(config.endpoint, config.initialParams || {});
  const accountOptions = useMemo(() => options.accounts || [], [options.accounts]);
  const selectedAccount = useMemo(() => {
    return accountOptions.find((account) => String(account.value) === String(selectedAccountId)) || accountOptions[0] || null;
  }, [accountOptions, selectedAccountId]);
  const visibleItems = useMemo(() => {
    const accountScopedItems = (!config.accountScoped || !selectedAccount)
      ? resource.items
      : resource.items.filter((item) => String(item.account_id) === String(selectedAccount.value));

    if (typeof config.filterItems === 'function') {
      return config.filterItems(accountScopedItems, { selectedAccount, options, resource });
    }

    return accountScopedItems;
  }, [config, options, resource, selectedAccount]);
  const isTransactionRoute = config.endpoint === '/transactions' || config.endpoint === '/incomes' || config.endpoint === '/expenses';
  const [visibleDatesCount, setVisibleDatesCount] = useState(3);

  const uniqueDates = useMemo(() => {
    const dates = new Set();
    visibleItems.forEach((item) => {
      const date = item.transaction_date || item.date || 'Tanpa tanggal';
      dates.add(date);
    });
    return Array.from(dates);
  }, [visibleItems]);

  const renderedItems = useMemo(() => {
    if (!isTransactionRoute) return visibleItems;
    const allowedDates = new Set(uniqueDates.slice(0, visibleDatesCount));
    return visibleItems.filter((item) => {
      const date = item.transaction_date || item.date || 'Tanpa tanggal';
      return allowedDates.has(date);
    });
  }, [visibleItems, uniqueDates, visibleDatesCount, isTransactionRoute]);

  // Reset visible dates count when params change (e.g. filter changes)
  useEffect(() => {
    if (isTransactionRoute) {
      setVisibleDatesCount(3);
    }
  }, [resource.params, isTransactionRoute]);

  // Automatically increment visible dates when new items are fetched and we had run out
  const prevUniqueDatesLengthRef = useRef(0);
  useEffect(() => {
    if (isTransactionRoute) {
      const prevLength = prevUniqueDatesLengthRef.current;
      const currentLength = uniqueDates.length;
      if (currentLength > prevLength && prevLength > 0 && visibleDatesCount >= prevLength) {
        setVisibleDatesCount((prev) => prev + 3);
      }
      prevUniqueDatesLengthRef.current = currentLength;
    }
  }, [uniqueDates.length, isTransactionRoute, visibleDatesCount]);

  // Handle scrolling to bottom to reveal more dates or load more pages
  useEffect(() => {
    if (!isTransactionRoute) return;

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
  }, [isTransactionRoute, visibleDatesCount, uniqueDates.length, resource]);

  const loadingMore = resource.isIncrementing && (
    <div className="mt-3 flex justify-center py-2">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></span>
    </div>
  );

  const renderTableContent = () => {
    if (resource.isLoading) {
      if (!config.mobileColumns) {
        return <DataTableSkeleton columns={config.columns} mobileLayout={config.mobileLayout} />;
      }

      return (
        <>
          <MobileResourceListSkeleton columns={config.mobileColumns} />
          <div className="hidden md:block">
            <DataTableSkeleton columns={config.columns} grouped={isTransactionRoute} />
          </div>
        </>
      );
    }

    if (resource.error) {
      return <ErrorState message={resource.error} onRetry={() => resource.load()} />;
    }

    if (visibleItems.length === 0) {
      return <EmptyState title={config.emptyTitle} description={config.emptyDescription} action={<Button onClick={openCreate}>{config.createLabel || 'Tambah data'}</Button>} />;
    }

    if (config.mobileColumns) {
      return (
        <>
          <MobileResourceList columns={config.mobileColumns} rows={renderedItems} onAction={setDetailTarget} />
          <div className="hidden md:block">
            <DataTable columns={config.columns} rows={renderedItems} onEdit={openEdit} onDelete={openDelete} canEditRow={config.canEdit} canDeleteRow={config.canDelete} />
          </div>
          {loadingMore}
        </>
      );
    }

    return (
      <>
        <DataTable
          columns={config.columns}
          rows={renderedItems}
          onEdit={openEdit}
          onDelete={openDelete}
          canEditRow={config.canEdit}
          canDeleteRow={config.canDelete}
          mobileLayout={config.mobileLayout}
        />
        {loadingMore}
      </>
    );
  };

  const defaultValues = useMemo(() => {
    const base = config.defaultValues || {};
    const scopedBase = config.accountScoped && selectedAccount ? { ...base, account_id: selectedAccount.value } : base;
    if (!editing) return scopedBase;
    return config.toForm ? config.toForm(editing) : { ...base, ...editing };
  }, [config, editing, selectedAccount]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.openCreate && isTransactionRoute) {
      openCreate();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, isTransactionRoute, navigate]);

  const openEdit = (row) => {
    if (config.canEdit && !config.canEdit(row)) {
      return;
    }

    setEditing(row);
    if (config.accountScoped && row.account_id) setSelectedAccountId(row.account_id);
    setDetailTarget(null);
    setFormOpen(true);
  };

  const openDelete = (row) => {
    if (config.canDelete && !config.canDelete(row)) {
      return;
    }

    setDeleting(row);
    setDetailTarget(null);
  };

  const submit = async (values) => {
    const scopedValues = config.accountScoped && selectedAccount && !editing ? { ...values, account_id: selectedAccount.value } : values;
    const payload = config.toPayload ? config.toPayload(scopedValues, editing, options) : scopedValues;
    const result = await resource.save(payload, editing?.id);
    if (result.ok) {
      setFormOpen(false);
      setEditing(null);
    } else {
      alert(result.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await resource.remove(deleting.id);
    if (result?.ok) {
      setDeleting(null);
      return;
    }

    alert(result?.message || 'Data belum bisa dihapus.');
  };

  // Configs without hand-picked detail rows fall back to their table columns.
  const detailRows = config.detailRows || config.columns.map((column) => ({
    label: column.label,
    render: (row) => (column.render ? column.render(row) : row[column.key] ?? '-'),
  }));

  return (
    <div className="space-y-3 md:space-y-4">
      <PageHeader title={config.title}>
        {headerActions}
        <Button onClick={openCreate}>
          <Plus size={18} className="mr-2" />
          {config.createLabel || 'Tambah'}
        </Button>
      </PageHeader>

      {typeof topContent === 'function' ? topContent({ resource, visibleItems }) : topContent}

      {config.summary && <div className="grid gap-3 md:grid-cols-3">{config.summary(resource.items)}</div>}

      {config.accountScoped && selectedAccount && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {accountOptions.map((account) => (
            <button
              key={account.value}
              type="button"
              onClick={() => setSelectedAccountId(account.value)}
              className={cn(
                'shrink-0 rounded-xl border px-4 py-2 text-left text-sm transition-colors',
                String(selectedAccount.value) === String(account.value)
                  ? 'border-primary-500 bg-primary-500 text-white'
                  : 'border-border-subtle bg-surface-panel text-text-body hover:border-border-strong hover:text-primary-600',
              )}
            >
              <span className="block font-semibold">{account.label.split(' - ')[0]}</span>
              <span className="block text-xs tabular-nums">{formatCurrency(account.balance)}</span>
            </button>
          ))}
        </div>
      )}

      {/* The table draws its own frame, so it sits directly on the page: no card around a card. */}
      <div key={resource.isLoading ? 'loading' : 'ready'} className="page-fade-in">{renderTableContent()}</div>

      {bottomContent}

      <Modal
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${config.singular}` : config.createLabel}
        description={config.formDescription}
        fullScreenOnMobile={config.fullScreenOnMobile || isTransactionRoute}
      >
        <Suspense fallback={<FormSkeleton fields={config.fields?.length || 6} />}>
          <ResourceForm
            schema={config.schema}
            fields={config.fields}
            defaultValues={defaultValues}
            options={{ ...options, __editing: editing }}
            isSaving={resource.isSaving}
            submitLabel={editing ? 'Simpan perubahan' : 'Simpan'}
            onSubmit={submit}
            isTransactionForm={isTransactionRoute}
            formLayout={config.formLayout}
          />
        </Suspense>
      </Modal>

      <Modal
        open={Boolean(detailTarget)}
        onClose={() => setDetailTarget(null)}
        title={`Detail ${config.singular}`}
        description={detailTarget && config.mobileColumns ? config.mobileColumns.title(detailTarget) : undefined}
        footer={detailTarget && (
          <DetailActions
            onEdit={!config.canEdit || config.canEdit(detailTarget) ? () => openEdit(detailTarget) : undefined}
            onDelete={!config.canDelete || config.canDelete(detailTarget) ? () => openDelete(detailTarget) : undefined}
          />
        )}
      >
        {detailTarget && (
          <dl className="divide-y divide-border-subtle text-sm">
            {detailRows.map((row) => (
              <div key={row.label} className="flex justify-between gap-4 py-2.5">
                <dt className="text-text-muted">{row.label}</dt>
                <dd className="text-right font-semibold text-text-title">{row.render(detailTarget)}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Hapus ${config.singular}?`}
        description="Data yang dihapus tidak akan tampil lagi di aplikasi."
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
