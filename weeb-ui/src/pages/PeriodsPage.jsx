import { lazy, Suspense, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import DataTable from '../components/data/DataTable';
import EmptyState from '../components/feedback/EmptyState';
import ErrorState from '../components/feedback/ErrorState';
import LoadingSkeleton from '../components/feedback/LoadingSkeleton';
import Modal, { ConfirmDialog } from '../components/forms/Modal';
import StatusBadge from '../components/feedback/StatusBadge';
import { configs } from '../features/shared/crudConfigs';
import { useCrudResource } from '../hooks/useCrudResource';
import { formatDate } from '../lib/formatters';
import { refreshPageQuickly } from '../lib/pageRefresh';

const ResourceForm = lazy(() => import('../components/forms/ResourceForm'));

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
      refreshPageQuickly();
    } else {
      alert(result.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await resource.remove(deleting.id);
    setDeleting(null);
  };

  const columns = [
    { key: 'name', label: 'Periode', mobileTitle: true },
    { key: 'range', label: 'Rentang', render: (row) => `${formatDate(row.start_date)} - ${formatDate(row.end_date)}` },
    { key: 'payday_date', label: 'Gajian', render: (row) => formatDate(row.payday_date) },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-title">Manajemen Periode</h1>
          <p className="mt-2 max-w-2xl text-text-muted">
            Kelola periode bulanan berdasarkan tahun agar laporan dan budget punya batas bulan yang jelas.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} className="mr-2" />
          Tambah periode {year}
        </Button>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => switchYear(year - 1)}>
              <ChevronLeft size={16} />
            </Button>
            <div className="rounded-2xl border border-primary-500/20 bg-primary-500/10 px-5 py-3 text-2xl font-semibold text-primary-600">
              {year}
            </div>
            <Button variant="secondary" size="sm" onClick={() => switchYear(year + 1)}>
              <ChevronRight size={16} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {yearRange(year).map((item) => (
              <button
                key={item}
                onClick={() => switchYear(item)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${item === year ? 'bg-primary-500 text-white shadow-glow-primary' : 'bg-surface-100 text-text-muted hover:bg-primary-500/10 hover:text-primary-600'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent><p className="text-sm text-text-muted">Jumlah periode</p><p className="mt-2 text-2xl font-semibold text-text-title">{resource.items.length}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-text-muted">Direncanakan</p><p className="mt-2 text-2xl font-semibold text-primary-600">{yearlySummary.plannedCount}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-text-muted">Periode aktif</p><p className="mt-2 text-2xl font-semibold text-success-base">{yearlySummary.activeCount}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Periode tahun {year}</CardTitle>
          <CardDescription>Tambah, edit, atau hapus periode untuk tahun yang sedang dipilih.</CardDescription>
        </CardHeader>
        <CardContent>
          {resource.isLoading ? (
            <LoadingSkeleton rows={5} />
          ) : resource.error ? (
            <ErrorState message={resource.error} onRetry={() => resource.load({ year, per_page: 50 })} />
          ) : resource.items.length === 0 ? (
            <EmptyState title={`Belum ada periode di ${year}`} description="Buat periode bulanan untuk mengatur batas laporan dan budget." action={<Button onClick={openCreate}>Tambah periode</Button>} />
          ) : (
            <DataTable columns={columns} rows={resource.items} onEdit={openEdit} onDelete={setDeleting} />
          )}
        </CardContent>
      </Card>

      <Modal
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit periode' : `Tambah periode ${year}`}
        description="Atur nama, rentang bulan, tanggal gajian, dan status periode."
        fullScreenOnMobile={true}
      >
        <Suspense fallback={<LoadingSkeleton rows={4} />}>
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
