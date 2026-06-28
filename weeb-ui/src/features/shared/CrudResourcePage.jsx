import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DataTable from '../../components/data/DataTable';
import EmptyState from '../../components/feedback/EmptyState';
import ErrorState from '../../components/feedback/ErrorState';
import LoadingSkeleton from '../../components/feedback/LoadingSkeleton';
import Modal, { ConfirmDialog } from '../../components/forms/Modal';
import { useCrudResource } from '../../hooks/useCrudResource';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { refreshPageQuickly } from '../../lib/pageRefresh';
import { lazyWithRetry } from '../../lib/lazyWithRetry';

const ResourceForm = lazy(lazyWithRetry(() => import('../../components/forms/ResourceForm'), 'ResourceForm'));

function MobileResourceList({ rows, columns, onAction }) {
  const [pressTimer, setPressTimer] = useState(null);
  const groupedRows = useMemo(() => {
    return rows.reduce((groups, row) => {
      const key = columns.dateKey ? columns.dateKey(row) : row.transaction_date || row.date || 'Tanpa tanggal';
      const existing = groups.find((group) => group.key === key);
      if (existing) {
        existing.rows.push(row);
      } else {
        groups.push({ key, label: key === 'Tanpa tanggal' ? key : formatDate(key), rows: [row] });
      }
      return groups;
    }, []);
  }, [columns, rows]);

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
        <span>{columns.numberLabel || 'No'}</span>
        <span>{columns.titleLabel || 'Kebutuhan'}</span>
        <span className="text-right">{columns.amountLabel || 'Nominal'}</span>
      </div>
      {groupedRows.map((group) => (
        <div key={group.key} className="space-y-2">
          <div className="space-y-1 px-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{group.label}</p>
            {columns.groupSummary && (
              <div className="flex flex-wrap gap-2 text-xs text-text-muted">
                {columns.groupSummary(group.rows).map((item) => (
                  <span key={item.label} className="rounded-full bg-surface-100 px-2.5 py-1">
                    <span className="font-semibold text-text-body">{item.label}:</span> {item.value}
                  </span>
                ))}
              </div>
            )}
          </div>
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
                <span className="block truncate">{columns.title(row)}</span>
                {columns.subtitle && <span className="mt-0.5 block text-xs font-normal text-text-muted">{columns.subtitle(row)}</span>}
              </span>
              <span className={`text-right text-sm font-semibold ${columns.amountClass ? columns.amountClass(row) : 'text-primary-600'}`}>{columns.amount(row)}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function CrudResourcePage({ config, options = {}, topContent = null, headerActions = null }) {
  const [editing, setEditing] = useState(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [actionTarget, setActionTarget] = useState(null);
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

  const renderTableContent = () => {
    if (resource.isLoading) {
      return <LoadingSkeleton rows={5} />;
    }

    if (resource.error) {
      return <ErrorState message={resource.error} onRetry={resource.load} />;
    }

    if (visibleItems.length === 0) {
      return <EmptyState title={config.emptyTitle} description={config.emptyDescription} action={<Button onClick={openCreate}>{config.createLabel || 'Tambah data'}</Button>} />;
    }

    if (config.mobileColumns) {
      return (
        <>
          <MobileResourceList columns={config.mobileColumns} rows={renderedItems} onAction={setActionTarget} />
          <div className="hidden md:block">
            <DataTable columns={config.columns} rows={renderedItems} onEdit={openEdit} onDelete={openDelete} canEditRow={config.canEdit} canDeleteRow={config.canDelete} />
          </div>
          {resource.isIncrementing && (
            <div className="mt-4 flex justify-center py-2">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></span>
            </div>
          )}
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
        {resource.isIncrementing && (
          <div className="mt-4 flex justify-center py-2">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></span>
          </div>
        )}
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
    setActionTarget(null);
    setFormOpen(true);
  };

  const openDetail = (row) => {
    setDetailTarget(row);
    setActionTarget(null);
  };

  const openDelete = (row) => {
    if (config.canDelete && !config.canDelete(row)) {
      return;
    }

    setDeleting(row);
    setActionTarget(null);
  };

  const submit = async (values) => {
    const scopedValues = config.accountScoped && selectedAccount && !editing ? { ...values, account_id: selectedAccount.value } : values;
    const payload = config.toPayload ? config.toPayload(scopedValues, editing, options) : scopedValues;
    const result = await resource.save(payload, editing?.id);
    if (result.ok) {
      setFormOpen(false);
      setEditing(null);
      refreshPageQuickly();
    } else {
      alert(result.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await resource.remove(deleting.id);
    if (result?.ok) {
      await options.reloadAccounts?.();
      setDeleting(null);
      return;
    }

    alert(result?.message || 'Data belum bisa dihapus.');
  };

  return (
    <div className="space-y-5 pb-10 md:space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold text-text-title md:text-3xl">{config.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">{config.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {headerActions}
          <Button onClick={openCreate}>
            <Plus size={18} className="mr-2" />
            {config.createLabel || 'Tambah'}
          </Button>
        </div>
      </header>

      {typeof topContent === 'function' ? topContent({ resource, visibleItems }) : topContent}

      {config.summary && <div className="grid gap-4 md:grid-cols-3">{config.summary(resource.items)}</div>}

      {config.accountScoped && selectedAccount && (
        <div className="rounded-[28px] border border-border-subtle bg-gradient-to-br from-surface-panel via-surface-panel to-surface-100/70 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted">Ringkasan rekening aktif</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-text-title">
                {formatCurrency(selectedAccount.balance)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-muted">
                <span className="rounded-full bg-surface-panel px-3 py-1 shadow-sm shadow-card-soft">
                  {selectedAccount.label.split(' - ')[0]}
                </span>
                <span>Tampilkan data berdasarkan rekening yang dipilih.</span>
              </div>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-surface-panel/90 px-4 py-3 shadow-sm shadow-card-soft md:min-w-[220px]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Saldo Tersedia</p>
              <p className="mt-2 text-xl font-semibold text-text-title">{formatCurrency(selectedAccount.balance)}</p>
            </div>
          </div>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1 md:mt-6">
            {accountOptions.map((account) => (
              <button
                key={account.value}
                type="button"
                onClick={() => setSelectedAccountId(account.value)}
                className={`shrink-0 rounded-xl border px-4 py-2 text-left text-sm transition-colors ${
                  String(selectedAccount.value) === String(account.value)
                    ? 'border-primary-500 bg-primary-500 text-white shadow-sm shadow-primary-500/20'
                    : 'border-border-subtle bg-surface-panel text-text-body hover:border-primary-500 hover:text-primary-600'
                }`}
              >
                <span className="block font-semibold">{account.label.split(' - ')[0]}</span>
                <span className="block text-xs opacity-80">{formatCurrency(account.balance)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {config.noCard ? (
        <div className="space-y-4">
          {config.tableTitle && (
            <div className="px-1">
              <h2 className="text-xl font-bold text-text-title">{config.tableTitle}</h2>
              {config.tableDescription && <p className="mt-1 text-sm text-text-muted">{config.tableDescription}</p>}
            </div>
          )}
          <div>{renderTableContent()}</div>
        </div>
      ) : config.unwrappedOnMobile ? (
        <>
          <div className="hidden md:block">
            <Card>
              <CardHeader>
                <CardTitle>{config.tableTitle || config.title}</CardTitle>
                <CardDescription>{config.tableDescription || 'Kelola data secara langsung dari halaman ini.'}</CardDescription>
              </CardHeader>
              <CardContent>{renderTableContent()}</CardContent>
            </Card>
          </div>
          <div className="md:hidden">
            {renderTableContent()}
          </div>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{config.tableTitle || config.title}</CardTitle>
            <CardDescription>{config.tableDescription || 'Kelola data secara langsung dari halaman ini.'}</CardDescription>
          </CardHeader>
          <CardContent>{renderTableContent()}</CardContent>
        </Card>
      )}

      <Modal
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${config.singular}` : config.createLabel}
        description={config.formDescription}
        fullScreenOnMobile={config.fullScreenOnMobile || config.endpoint === '/transactions' || config.endpoint === '/incomes' || config.endpoint === '/expenses'}
      >
        <Suspense fallback={<LoadingSkeleton rows={4} />}>
          <ResourceForm
            schema={config.schema}
            fields={config.fields}
            defaultValues={defaultValues}
            options={{ ...options, __editing: editing }}
            isSaving={resource.isSaving}
            submitLabel={editing ? 'Simpan perubahan' : 'Simpan'}
            onSubmit={submit}
            isTransactionForm={config.endpoint === '/transactions' || config.endpoint === '/incomes' || config.endpoint === '/expenses'}
            formLayout={config.formLayout}
          />
        </Suspense>
      </Modal>

      <Modal
        open={Boolean(detailTarget)}
        onClose={() => setDetailTarget(null)}
        title={`Detail ${config.singular}`}
        description={detailTarget && config.mobileColumns ? config.mobileColumns.title(detailTarget) : undefined}
      >
        {detailTarget && (
          <div className="space-y-3 text-sm">
            {config.detailRows?.map((row) => (
              <div key={row.label} className="flex justify-between gap-4">
                <span className="text-text-muted">{row.label}</span>
                <span className="text-right font-semibold text-text-title">{row.render(detailTarget)}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(actionTarget)}
        onClose={() => setActionTarget(null)}
        title={`Aksi ${config.singular}`}
        description={actionTarget && config.mobileColumns ? config.mobileColumns.title(actionTarget) : undefined}
      >
        <div className="grid gap-3">
          <Button variant="secondary" onClick={() => openDetail(actionTarget)}><Eye size={18} className="mr-2" />Detail</Button>
          {(!config.canEdit || config.canEdit(actionTarget)) && (
            <Button variant="secondary" onClick={() => openEdit(actionTarget)}><Pencil size={18} className="mr-2" />Edit</Button>
          )}
          {(!config.canDelete || config.canDelete(actionTarget)) && (
            <Button variant="danger" onClick={() => openDelete(actionTarget)}><Trash2 size={18} className="mr-2" />Hapus</Button>
          )}
        </div>
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
