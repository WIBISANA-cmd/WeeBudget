import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DataTable from '../../components/data/DataTable';
import EmptyState from '../../components/feedback/EmptyState';
import ErrorState from '../../components/feedback/ErrorState';
import LoadingSkeleton from '../../components/feedback/LoadingSkeleton';
import Modal, { ConfirmDialog } from '../../components/forms/Modal';
import ResourceForm from '../../components/forms/ResourceForm';
import { useCrudResource } from '../../hooks/useCrudResource';

export default function CrudResourcePage({ config, options = {} }) {
  const [editing, setEditing] = useState(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const resource = useCrudResource(config.endpoint, config.initialParams || {});

  const defaultValues = useMemo(() => {
    const base = config.defaultValues || {};
    if (!editing) return base;
    return config.toForm ? config.toForm(editing) : { ...base, ...editing };
  }, [config, editing]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormOpen(true);
  };

  const submit = async (values) => {
    const payload = config.toPayload ? config.toPayload(values, editing) : values;
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
    await resource.remove(deleting.id);
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-title md:text-3xl">{config.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">{config.description}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} className="mr-2" />
          {config.createLabel || 'Tambah'}
        </Button>
      </header>

      {config.summary && <div className="grid gap-4 md:grid-cols-3">{config.summary(resource.items)}</div>}

      <Card>
        <CardHeader>
          <CardTitle>{config.tableTitle || config.title}</CardTitle>
          <CardDescription>{config.tableDescription || 'Kelola data secara langsung dari halaman ini.'}</CardDescription>
        </CardHeader>
        <CardContent>
          {resource.isLoading ? (
            <LoadingSkeleton rows={5} />
          ) : resource.error ? (
            <ErrorState message={resource.error} onRetry={resource.load} />
          ) : resource.items.length === 0 ? (
            <EmptyState title={config.emptyTitle} description={config.emptyDescription} action={<Button onClick={openCreate}>{config.createLabel || 'Tambah data'}</Button>} />
          ) : (
            <DataTable columns={config.columns} rows={resource.items} onEdit={openEdit} onDelete={setDeleting} />
          )}
        </CardContent>
      </Card>

      <Modal
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${config.singular}` : config.createLabel}
        description={config.formDescription}
      >
        <ResourceForm
          schema={config.schema}
          fields={config.fields}
          defaultValues={defaultValues}
          options={options}
          isSaving={resource.isSaving}
          submitLabel={editing ? 'Simpan perubahan' : 'Simpan'}
          onSubmit={submit}
        />
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
