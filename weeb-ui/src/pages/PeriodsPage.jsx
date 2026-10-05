import { lazy, Suspense, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import PageHeader from '../components/layout/PageHeader';
import DataTable, { DataTableSkeleton } from '../components/data/DataTable';
import EmptyState from '../components/feedback/EmptyState';
import ErrorState from '../components/feedback/ErrorState';
import { FormSkeleton, Skeleton } from '../components/feedback/LoadingSkeleton';
import Modal, { ConfirmDialog } from '../components/forms/Modal';
import StatusBadge from '../components/feedback/StatusBadge';
import { configs } from '../features/shared/crudConfigs';
import { useCrudResource } from '../hooks/useCrudResource';
import { formatDate } from '../lib/formatters';
import { cn } from '../lib/utils';

const ResourceForm = lazy(() => import('../components/forms/ResourceForm'));

const STATUS_LABELS = { planned: 'Direncanakan', active: 'Aktif', closed: 'Ditutup' };

const columns = [
  { key: 'name', label: 'Periode', mobileTitle: true },
  { key: 'range', label: 'Rentang', render: (row) => `${formatDate(row.start_date)} - ${formatDate(row.end_date)}` },
  { key: 'payday_date', label: 'Gajian', render: (row) => formatDate(row.payday_date) },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status}>{STATUS_LABELS[row.status] || row.status}</StatusBadge> },
];

function yearRange(activeYear) {
  return [activeYear - 2, activeYear - 1, activeYear, activeYear + 1, activeYear + 2];
}

export default function PeriodsPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [editing, setEditing] = useState(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const resource = useCrudResource('/periods', { year, per_page: 50 });
  const config = configs.periods;

  const yearlySummary = useMemo(() => {
    return resource.items.reduce((summary, period) => ({
      activeCount: summary.activeCount + (period.status === 'active' ? 1 : 0),
      plannedCount: summary.plannedCount + (period.status === 'planned' ? 1 : 0),
      closedCount: summary.closedCount + (period.status === 'closed' ? 1 : 0),
    }), { activeCount: 0, plannedCount: 0, closedCount: 0 });
  }, [resource.items]);

  const switchYear = (nextYear) => {
    setYear(nextYear);
    resource.setParams({ year: nextYear, per_page: 50 });
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormOpen(true);
  };

  const defaultValues = editing ? {
    name: editing.name,
    start_date: editing.start_date,
    end_date: editing.end_date,
    payday_date: editing.payday_date || '',
    status: editing.status,
    notes: editing.notes || '',
  } : {
    ...config.defaultValues,
    name: `Periode ${year}`,
    start_date: `${year}-01-01`,
    end_date: `${year}-01-31`,
    payday_date: `${year}-01-25`,
  };

  const submit = async (values) => {
    const result = await resource.save({
      ...values,
      opening_balance: 0,
      income_target: 0,
      expense_limit: 0,
    }, editing?.id);
    if (result.ok) {
      setFormOpen(false);
      setEditing(null);
    } else {
      alert(result.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await resource.remove(deleting.id);
    setDeleting(null);
  };

  const stats = [
    { label: 'Aktif', value: yearlySummary.activeCount, tone: 'text-success-base' },
    { label: 'Direncanakan', value: yearlySummary.plannedCount, tone: 'text-primary-600' },
    { label: 'Ditutup', value: yearlySummary.closedCount, tone: 'text-text-title' },
  ];

  return (
    <div className="space-y-3 md:space-y-4">
      <PageHeader title="Periode">
        <Button onClick={openCreate}>
          <Plus size={18} className="mr-2" />
          Tambah periode
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => switchYear(year - 1)} aria-label="Tahun sebelumnya" className="flex h-9 w-9 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-hover-soft hover:text-text-title">
              <ChevronLeft size={18} />
            </button>
            <div className="flex gap-1">
              {yearRange(year).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => switchYear(item)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-semibold tabular-nums transition-colors',
                    item === year ? 'bg-primary-500 text-white' : 'text-text-muted hover:bg-hover-soft hover:text-text-title',
                    Math.abs(item - year) === 2 && 'max-sm:hidden',
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => switchYear(year + 1)} aria-label="Tahun berikutnya" className="flex h-9 w-9 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-hover-soft hover:text-text-title">
              <ChevronRight size={18} />
            </button>
          </div>

          <dl className="flex gap-6">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="text-xs text-text-muted">{stat.label}</dt>
                {resource.isLoading
                  ? <Skeleton className="mt-1.5 h-5 w-6" />
                  : <dd className={cn('text-lg font-semibold tabular-nums', stat.tone)}>{stat.value}</dd>}
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {resource.isLoading ? (
        <DataTableSkeleton columns={columns} rows={6} />
      ) : resource.error ? (
        <ErrorState message={resource.error} onRetry={() => resource.load({ year, per_page: 50 })} />
      ) : resource.items.length === 0 ? (
        <EmptyState title={`Belum ada periode di ${year}`} description="Buat periode untuk mengatur batas laporan dan budget." action={<Button onClick={openCreate}>Tambah periode</Button>} />
      ) : (
        <DataTable columns={columns} rows={resource.items} onEdit={openEdit} onDelete={setDeleting} />
      )}

      <Modal
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit periode' : `Tambah periode ${year}`}
        fullScreenOnMobile={true}
      >
        <Suspense fallback={<FormSkeleton fields={config.fields.length} />}>
          <ResourceForm
            schema={config.schema}
            fields={config.fields}
            defaultValues={defaultValues}
            isSaving={resource.isSaving}
            submitLabel={editing ? 'Simpan perubahan' : 'Simpan periode'}
            onSubmit={submit}
          />
        </Suspense>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus periode?"
        description="Periode yang dihapus tidak akan tampil lagi di daftar tahun ini."
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
