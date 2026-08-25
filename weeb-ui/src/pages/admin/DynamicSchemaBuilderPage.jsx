import { useEffect, useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Database, Layers, Check, X, Pencil, Trash2, Sliders, 
  Settings, Key, AlertCircle, Info, ExternalLink, ArrowUpDown, Eye
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import SelectBox from '../../components/ui/SelectBox';
import StatusBadge from '../../components/feedback/StatusBadge';
import EmptyState from '../../components/feedback/EmptyState';
import ErrorState from '../../components/feedback/ErrorState';
import LoadingSkeleton from '../../components/feedback/LoadingSkeleton';
import Modal, { ConfirmDialog } from '../../components/forms/Modal';
import DynamicIcon from '../../components/dynamic/DynamicIcon';
import { 
  fetchAllSchemas, createSchema, updateSchema, deleteSchema,
  addSchemaField, updateSchemaField, deleteSchemaField,
  introspectSchemas, introspectTables, introspectColumns 
} from '../../api/dynamicSchema';
import { cn } from '../../lib/utils';

const ICON_CHOICES = [
  'Database', 'Package', 'Layers', 'Boxes', 'Tag', 'FileText', 'Folder', 
  'Users', 'UserCheck', 'Building', 'Briefcase', 'ShoppingCart', 'ShoppingBag', 
  'Bookmark', 'Compass', 'Globe', 'Gift', 'HelpCircle', 'List', 'MapPin', 
  'Receipt', 'Shield', 'Sparkles', 'Sliders', 'Activity', 'Archive'
];

const FIELD_TYPES = [
  { value: 'text', label: 'Teks Pendek (text)' },
  { value: 'textarea', label: 'Teks Panjang (textarea)' },
  { value: 'richtext', label: 'HTML / WYSIWYG (richtext)' },
  { value: 'number', label: 'Angka / Nominal (number)' },
  { value: 'boolean', label: 'Ya / Tidak (boolean)' },
  { value: 'date', label: 'Tanggal (date - YYYY-MM-DD)' },
  { value: 'datetime', label: 'Tanggal & Waktu (datetime)' },
  { value: 'email', label: 'Email (email)' },
  { value: 'url', label: 'Tautan URL (url)' },
  { value: 'select', label: 'Pilihan Tunggal (select)' },
  { value: 'multiselect', label: 'Pilihan Ganda (multiselect)' },
  { value: 'file', label: 'Berkas / File Upload (file)' },
  { value: 'relation', label: 'Relasi ke Entitas Lain (relation)' },
  { value: 'relation_many', label: 'Relasi Banyak (relation_many)' },
];

const FEATURE_LIST = [
  { key: 'create', label: 'Tambah Data (create)' },
  { key: 'edit', label: 'Ubah Data (edit)' },
  { key: 'delete', label: 'Hapus Data (delete)' },
  { key: 'search', label: 'Pencarian (search)' },
  { key: 'filter', label: 'Filter Kolom (filter)' },
  { key: 'export', label: 'Ekspor CSV (export)' },
  { key: 'import', label: 'Impor CSV (import)' },
];

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 48);
}

export default function DynamicSchemaBuilderPage() {
  const navigate = useNavigate();
  const [entities, setEntities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [selectedEntityForFields, setSelectedEntityForFields] = useState(null);
  const [deletingEntity, setDeletingEntity] = useState(null);

  // Field modal state
  const [isFieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [deletingField, setDeletingField] = useState(null);

  // Entity form state
  const [entityMode, setEntityMode] = useState('document'); // 'document' | 'bound'
  const [label, setLabel] = useState('');
  const [labelPlural, setLabelPlural] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Database');
  const [features, setFeatures] = useState(['create', 'edit', 'delete', 'search', 'filter', 'export', 'import']);
  const [menuOrder, setMenuOrder] = useState(100);

  // Mode B introspection state
  const [dbSchemas, setDbSchemas] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState('public');
  const [dbTables, setDbTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableColumns, setTableColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState({});
  const [primaryKeyCol, setPrimaryKeyCol] = useState(null);
  const [isIntrospecting, setIsIntrospecting] = useState(false);
  const [isSavingEntity, setIsSavingEntity] = useState(false);

  // Field form state
  const [fieldKey, setFieldKey] = useState('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldUnique, setFieldUnique] = useState(false);
  const [fieldListVisible, setFieldListVisible] = useState(true);
  const [fieldFormVisible, setFieldFormVisible] = useState(true);
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldHelpText, setFieldHelpText] = useState('');
  const [fieldChoicesDraft, setFieldChoicesDraft] = useState('');
  const [fieldRelationTarget, setFieldRelationTarget] = useState('');
  const [fieldRelationDisplay, setFieldRelationDisplay] = useState('id');
  const [fieldMinNumber, setFieldMinNumber] = useState('');
  const [fieldMaxNumber, setFieldMaxNumber] = useState('');
  const [fieldIntegerOnly, setFieldIntegerOnly] = useState(false);
  const [fieldPattern, setFieldPattern] = useState('');
  const [isSavingField, setIsSavingField] = useState(false);

  const loadEntities = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchAllSchemas();
      setEntities(data);
      if (selectedEntityForFields) {
        const updated = data.find((e) => e.id === selectedEntityForFields.id);
        if (updated) setSelectedEntityForFields(updated);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat skema entitas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEntities();
  }, []);

  // Introspection effect
  useEffect(() => {
    if (isCreateModalOpen && entityMode === 'bound') {
      introspectSchemas().then(setDbSchemas).catch(() => {});
    }
  }, [isCreateModalOpen, entityMode]);

  useEffect(() => {
    if (entityMode === 'bound' && selectedSchema) {
      introspectTables(selectedSchema).then(setDbTables).catch(() => {});
    }
  }, [entityMode, selectedSchema]);

  useEffect(() => {
    if (entityMode === 'bound' && selectedSchema && selectedTable) {
      setIsIntrospecting(true);
      introspectColumns(selectedSchema, selectedTable)
        .then((res) => {
          setTableColumns(res.columns || []);
          setPrimaryKeyCol(res.primary_key);
          const initialSelection = {};
          (res.columns || []).forEach((col) => {
            initialSelection[col.name] = true;
          });
          setSelectedColumns(initialSelection);
        })
        .catch(() => {})
        .finally(() => setIsIntrospecting(false));
    }
  }, [entityMode, selectedSchema, selectedTable]);

  const handleLabelChange = (e) => {
    const val = e.target.value;
    setLabel(val);
    if (!slugManuallyEdited) {
      setSlug(slugify(val));
    }
    if (!editingEntity && !labelPlural) {
      setLabelPlural(val);
    }
  };

  const openCreateModal = () => {
    setEditingEntity(null);
    setEntityMode('document');
    setLabel('');
    setLabelPlural('');
    setSlug('');
    setSlugManuallyEdited(false);
    setDescription('');
    setIcon('Database');
    setFeatures(['create', 'edit', 'delete', 'search', 'filter', 'export', 'import']);
    setMenuOrder(100);
    setSelectedTable('');
    setTableColumns([]);
    setCreateModalOpen(true);
  };

  const openEditEntityModal = (entity) => {
    setEditingEntity(entity);
    setEntityMode(entity.source_table ? 'bound' : 'document');
    setLabel(entity.label);
    setLabelPlural(entity.label_plural);
    setSlug(entity.slug);
    setDescription(entity.description || '');
    setIcon(entity.icon || 'Database');
    setFeatures(entity.features || []);
    setMenuOrder(entity.menu_order || 100);
    setCreateModalOpen(true);
  };

  const toggleFeature = (featKey) => {
    setFeatures((prev) => 
      prev.includes(featKey) ? prev.filter((f) => f !== featKey) : [...prev, featKey]
    );
  };

  const toggleEntityActive = async (entity) => {
    try {
      await updateSchema(entity.slug, { is_active: !entity.is_active });
      loadEntities();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status aktif entitas.');
    }
  };

  const saveEntity = async (e) => {
    e.preventDefault();
    if (!label.trim()) return alert('Nama entitas wajib diisi.');
    if (!slug.trim()) return alert('Slug wajib diisi.');

    setIsSavingEntity(true);
    try {
      if (editingEntity) {
        await updateSchema(editingEntity.slug, {
          label,
          label_plural: labelPlural || label,
          description,
          icon,
          features,
          menu_order: Number(menuOrder),
        });
      } else {
        let initialFields = [];

        if (entityMode === 'bound' && tableColumns.length > 0) {
          initialFields = tableColumns
            .filter((col) => selectedColumns[col.name] || col.name === primaryKeyCol)
            .map((col, idx) => ({
              key: col.name,
              label: col.name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
              type: col.inferred_type || 'text',
              is_required: !col.is_nullable && col.name !== primaryKeyCol,
              is_unique: col.is_pk,
              order_index: idx + 1,
              list_visible: true,
              form_visible: col.name !== primaryKeyCol,
            }));
        }

        await createSchema({
          slug,
          label,
          label_plural: labelPlural || label,
          description,
          icon,
          features,
          menu_order: Number(menuOrder),
          source_schema: entityMode === 'bound' ? selectedSchema : null,
          source_table: entityMode === 'bound' ? selectedTable : null,
          source_pk: entityMode === 'bound' ? primaryKeyCol : null,
          initial_fields: initialFields,
        });
      }

      setCreateModalOpen(false);
      loadEntities();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan entitas.');
    } finally {
      setIsSavingEntity(false);
    }
  };

  const confirmDeleteEntity = async () => {
    if (!deletingEntity) return;
    try {
      await deleteSchema(deletingEntity.slug);
      setDeletingEntity(null);
      if (selectedEntityForFields?.id === deletingEntity.id) {
        setSelectedEntityForFields(null);
      }
      loadEntities();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus entitas.');
    }
  };

  // Field Management
  const openAddFieldModal = () => {
    setEditingField(null);
    setFieldKey('');
    setFieldLabel('');
    setFieldType('text');
    setFieldRequired(false);
    setFieldUnique(false);
    setFieldListVisible(true);
    setFieldFormVisible(true);
    setFieldPlaceholder('');
    setFieldHelpText('');
    setFieldChoicesDraft('');
    setFieldRelationTarget('');
    setFieldRelationDisplay('id');
    setFieldMinNumber('');
    setFieldMaxNumber('');
    setFieldIntegerOnly(false);
    setFieldPattern('');
    setFieldModalOpen(true);
  };

  const openEditFieldModal = (field) => {
    setEditingField(field);
    setFieldKey(field.key);
    setFieldLabel(field.label);
    setFieldType(field.type);
    setFieldRequired(Boolean(field.is_required));
    setFieldUnique(Boolean(field.is_unique));
    setFieldListVisible(Boolean(field.list_visible));
    setFieldFormVisible(Boolean(field.form_visible));
    setFieldPlaceholder(field.placeholder || '');
    setFieldHelpText(field.help_text || '');

    const opts = field.options || {};
    if (Array.isArray(opts.choices)) {
      setFieldChoicesDraft(opts.choices.map((c) => (typeof c === 'object' ? c.value : c)).join(', '));
    } else {
      setFieldChoicesDraft('');
    }

    setFieldRelationTarget(opts.relation?.entity || '');
    setFieldRelationDisplay(opts.relation?.display || 'id');
    setFieldMinNumber(opts.min !== undefined ? opts.min : '');
    setFieldMaxNumber(opts.max !== undefined ? opts.max : '');
    setFieldIntegerOnly(Boolean(opts.integer_only));
    setFieldPattern(opts.pattern || '');
    setFieldModalOpen(true);
  };

  const saveField = async (e) => {
    e.preventDefault();
    if (!fieldLabel.trim()) return alert('Label field wajib diisi.');
    if (!editingField && !fieldKey.trim()) return alert('Key field wajib diisi.');

    setIsSavingField(true);

    const options = {};
    if (['select', 'multiselect'].includes(fieldType)) {
      options.choices = fieldChoicesDraft
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
    }
    if (['relation', 'relation_many'].includes(fieldType)) {
      options.relation = {
        entity: fieldRelationTarget,
        display: fieldRelationDisplay || 'id',
      };
    }
    if (fieldType === 'number') {
      if (fieldMinNumber !== '') options.min = Number(fieldMinNumber);
      if (fieldMaxNumber !== '') options.max = Number(fieldMaxNumber);
      if (fieldIntegerOnly) options.integer_only = true;
    }
    if (fieldType === 'text' && fieldPattern.trim()) {
      options.pattern = fieldPattern.trim();
    }

    try {
      if (editingField) {
        await updateSchemaField(selectedEntityForFields.slug, editingField.id, {
          label: fieldLabel,
          is_required: fieldRequired,
          is_unique: fieldUnique,
          list_visible: fieldListVisible,
          form_visible: fieldFormVisible,
          placeholder: fieldPlaceholder,
          help_text: fieldHelpText,
          options,
        });
      } else {
        await addSchemaField(selectedEntityForFields.slug, {
          key: slugify(fieldKey),
          label: fieldLabel,
          type: fieldType,
          is_required: fieldRequired,
          is_unique: fieldUnique,
          list_visible: fieldListVisible,
          form_visible: fieldFormVisible,
          placeholder: fieldPlaceholder,
          help_text: fieldHelpText,
          order_index: (selectedEntityForFields.fields?.length || 0) + 1,
          options,
        });
      }

      setFieldModalOpen(false);
      loadEntities();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan field.');
    } finally {
      setIsSavingField(false);
    }
  };

  const confirmDeleteField = async () => {
    if (!deletingField || !selectedEntityForFields) return;
    try {
      await deleteSchemaField(selectedEntityForFields.slug, deletingField.id);
      setDeletingField(null);
      loadEntities();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus field.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-title md:text-3xl">Skema Dinamis (CRUD Builder)</h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Bangun modul data dan form CRUD kustom secara instan tanpa menyentuh kode.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate('/admin/menu')} variant="secondary">
            <Sliders size={18} className="mr-2" />
            Pengaturan Menu
          </Button>
          <Button onClick={openCreateModal}>
            <Plus size={18} className="mr-2" />
            Entitas Baru
          </Button>
        </div>
      </header>

      {/* Main Entities List */}
      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadEntities} />
      ) : entities.length === 0 ? (
        <EmptyState
          title="Belum ada entitas dinamis"
          description="Buat entitas dinamis pertama Anda untuk menambahkan menu dan tabel data kustom."
          action={<Button onClick={openCreateModal}><Plus size={18} className="mr-2" />Buat Entitas Baru</Button>}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left Column: Entities Table */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Daftar Entitas Dinamis</CardTitle>
              <CardDescription>Pilih entitas untuk melihat dan mengelola field kolomnya.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border-subtle">
                {entities.map((entity) => {
                  const isSelected = selectedEntityForFields?.id === entity.id;
                  const isBound = Boolean(entity.source_table);

                  return (
                    <div
                      key={entity.id}
                      onClick={() => setSelectedEntityForFields(entity)}
                      className={cn(
                        'flex cursor-pointer items-center justify-between gap-4 p-4 transition-all hover:bg-surface-100/60',
                        isSelected && 'border-l-4 border-l-primary-500 bg-primary-500/5'
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-600">
                          <DynamicIcon name={entity.icon} size={22} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-semibold text-text-title">{entity.label_plural || entity.label}</span>
                            <span className="text-xs font-mono text-text-muted">/{entity.slug}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                            <span className={cn('rounded-full px-2 py-0.5 font-medium', isBound ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600')}>
                              {isBound ? `Tabel: ${entity.source_schema || 'public'}.${entity.source_table}` : 'Dokumen JSON'}
                            </span>
                            <span>•</span>
                            <span>{entity.fields?.length || 0} field</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => toggleEntityActive(entity)}
                          aria-pressed={entity.is_active}
                          className={cn(
                            'rounded-full px-2.5 py-1 text-xs font-semibold transition-all',
                            entity.is_active
                              ? 'bg-success-base/15 text-success-base hover:bg-success-base/25'
                              : 'bg-surface-200 text-text-muted hover:bg-surface-300'
                          )}
                          title="Klik untuk mengubah status aktif"
                        >
                          {entity.is_active ? 'Aktif' : 'Nonaktif'}
                        </button>
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/data/${entity.slug}`)} title="Buka Halaman CRUD">
                          <Eye size={15} />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => openEditEntityModal(entity)} title="Edit Pengaturan Entitas">
                          <Pencil size={15} />
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setDeletingEntity(entity)} title="Hapus Entitas">
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Fields Manager for Selected Entity */}
          <div>
            {selectedEntityForFields ? (
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <DynamicIcon name={selectedEntityForFields.icon} size={20} className="text-primary-600" />
                      <CardTitle>Field: {selectedEntityForFields.label_plural}</CardTitle>
                    </div>
                    <CardDescription className="mt-1">
                      Kelola daftar atribut kolom dan validasi untuk entitas <span className="font-mono font-semibold text-text-title">{selectedEntityForFields.slug}</span>.
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={openAddFieldModal}>
                    <Plus size={16} className="mr-1.5" />
                    Tambah Field
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {selectedEntityForFields.fields?.length === 0 ? (
                    <div className="p-6 text-center text-sm text-text-muted">
                      Belum ada field yang didefinisikan. Klik tombol di atas untuk menambahkan field pertama.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border-subtle text-left text-sm">
                        <thead className="bg-surface-100/70 text-xs font-semibold uppercase tracking-wider text-text-muted">
                          <tr>
                            <th className="px-4 py-3">Label / Kunci</th>
                            <th className="px-4 py-3">Tipe</th>
                            <th className="px-4 py-3">Aturan</th>
                            <th className="px-4 py-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                          {selectedEntityForFields.fields.map((f) => (
                            <tr key={f.id} className="ui-hover-surface">
                              <td className="px-4 py-3">
                                <span className="font-medium text-text-title">{f.label}</span>
                                <span className="block font-mono text-xs text-text-muted">{f.key}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="rounded-md bg-surface-100 px-2 py-1 text-xs font-medium text-text-body">
                                  {f.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs">
                                <div className="flex flex-wrap gap-1">
                                  {f.is_required && <span className="rounded bg-danger-base/10 px-1.5 py-0.5 text-danger-base">Wajib</span>}
                                  {f.is_unique && <span className="rounded bg-primary-500/10 px-1.5 py-0.5 text-primary-600">Unik</span>}
                                  {!f.list_visible && <span className="rounded bg-surface-200 px-1.5 py-0.5 text-text-muted">Sembunyi di Tabel</span>}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => openEditFieldModal(f)}
                                    className="rounded-lg p-1.5 text-text-muted hover:bg-surface-100 hover:text-text-title"
                                    aria-label="Edit field"
                                  >
                                    <Pencil size={15} />
                                  </button>
                                  <button
                                    onClick={() => setDeletingField(f)}
                                    className="rounded-lg p-1.5 text-danger-base hover:bg-danger-base/10"
                                    aria-label="Hapus field"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center text-text-muted">
                <Layers size={36} className="mb-3 text-text-muted/60" />
                <p className="font-semibold text-text-title">Pilih entitas dari daftar</p>
                <p className="mt-1 text-sm">Klik salah satu entitas di sebelah kiri untuk melihat dan mengedit fieldnya.</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Modal Entitas Baru / Edit */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={editingEntity ? `Edit Entitas: ${editingEntity.label}` : 'Buat Entitas Dinamis Baru'}
        description="Konfigurasi skema penyimpanan dan informasi menu entitas dinamis."
      >
        <form onSubmit={saveEntity} className="space-y-5">
          {!editingEntity && (
            <div className="flex rounded-2xl bg-surface-100 p-1">
              <button
                type="button"
                onClick={() => setEntityMode('document')}
                className={cn(
                  'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all',
                  entityMode === 'document' ? 'bg-surface-panel text-primary-600 shadow-sm' : 'text-text-muted hover:text-text-body'
                )}
              >
                Mode Dokumen (Baru)
              </button>
              <button
                type="button"
                onClick={() => setEntityMode('bound')}
                className={cn(
                  'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all',
                  entityMode === 'bound' ? 'bg-surface-panel text-primary-600 shadow-sm' : 'text-text-muted hover:text-text-body'
                )}
              >
                Mode Terikat Tabel DB
              </button>
            </div>
          )}

          {entityMode === 'bound' && !editingEntity && (
            <div className="space-y-4 rounded-2xl border border-border-subtle bg-surface-100/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Pilih Tabel Sumber Database</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectBox
                  label="Schema Database"
                  value={selectedSchema}
                  onChange={(opt) => setSelectedSchema(opt.value)}
                  options={dbSchemas.map((s) => ({ value: s, label: s }))}
                />
                <SelectBox
                  label="Tabel"
                  value={selectedTable}
                  onChange={(opt) => setSelectedTable(opt.value)}
                  options={dbTables.map((t) => ({ value: t, label: t }))}
                  placeholder="Pilih tabel..."
                />
              </div>

              {selectedTable && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium text-text-body">Pilih Kolom yang Dilibatkan:</p>
                  {isIntrospecting ? (
                    <LoadingSkeleton rows={3} />
                  ) : (
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-border-subtle bg-surface-panel p-2">
                      {tableColumns.map((col) => {
                        const isPk = col.name === primaryKeyCol;
                        const isChecked = selectedColumns[col.name] || isPk;

                        return (
                          <label key={col.name} className="flex cursor-pointer items-center justify-between rounded-lg p-2 hover:bg-surface-100">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isPk}
                                onChange={(e) => {
                                  if (isPk) return;
                                  setSelectedColumns((prev) => ({ ...prev, [col.name]: e.target.checked }));
                                }}
                                className="rounded text-primary-600"
                              />
                              <span className="font-mono text-sm font-medium text-text-title">{col.name}</span>
                              {isPk && <span className="rounded bg-primary-500/10 px-1.5 py-0.2 text-[11px] font-semibold text-primary-600">PK (Terkunci)</span>}
                            </div>
                            <span className="text-xs text-text-muted">{col.type} → {col.inferred_type}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nama Entitas (Bentuk Tunggal)"
              placeholder="Contoh: Kategori Produk"
              value={label}
              onChange={handleLabelChange}
              required
            />
            <Input
              label="Judul Halaman (Bentuk Jamak)"
              placeholder="Contoh: Daftar Kategori Produk"
              value={labelPlural}
              onChange={(e) => setLabelPlural(e.target.value)}
              required
            />
          </div>

          <Input
            label="Slug URL (Identifier Unik)"
            placeholder="contoh_kategori"
            value={slug}
            disabled={Boolean(editingEntity)}
            onChange={(e) => {
              setSlugManuallyEdited(true);
              setSlug(slugify(e.target.value));
            }}
            helperText={editingEntity ? "Slug tidak dapat diubah setelah dibuat." : "Digunakan sebagai path URL: /admin/data/{slug}"}
            required
          />

          <Input
            label="Deskripsi (Opsional)"
            placeholder="Keterangan singkat mengenai data entitas ini..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Curated Icon Selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-text-body">Pilih Ikon Menu:</label>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
              {ICON_CHOICES.map((icName) => {
                const isSelected = icon === icName;
                return (
                  <button
                    key={icName}
                    type="button"
                    onClick={() => setIcon(icName)}
                    className={cn(
                      'flex items-center justify-center rounded-xl p-2.5 transition-all',
                      isSelected
                        ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                        : 'bg-surface-100 text-text-muted hover:bg-surface-200 hover:text-text-title'
                    )}
                    title={icName}
                    aria-label={icName}
                  >
                    <DynamicIcon name={icName} size={20} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feature flags selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-text-body">Fitur yang Diaktifkan:</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {FEATURE_LIST.map((feat) => {
                const isChecked = features.includes(feat.key);
                return (
                  <label key={feat.key} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border-subtle bg-surface-100/60 p-2.5 text-xs font-medium hover:border-primary-400">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleFeature(feat.key)}
                      className="rounded text-primary-600"
                    />
                    <span className="text-text-body">{feat.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
            <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" isLoading={isSavingEntity}>
              {editingEntity ? 'Simpan Perubahan' : 'Buat Entitas'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Tambah / Edit Field */}
      <Modal
        open={isFieldModalOpen}
        onClose={() => setFieldModalOpen(false)}
        title={editingField ? `Edit Field: ${editingField.label}` : 'Tambah Field Baru'}
        description="Tentukan nama, tipe data, dan aturan validasi untuk field ini."
      >
        <form onSubmit={saveField} className="space-y-4">
          {editingField && (
            <div className="rounded-xl border border-warning-base/30 bg-warning-base/10 p-3 text-xs text-text-body">
              <strong>Catatan:</strong> Kunci field (<code className="font-mono font-bold">{editingField.key}</code>) dan Tipe data (<code className="font-mono font-bold">{editingField.type}</code>) tidak dapat diubah setelah dibuat untuk menjaga integritas data yang sudah tersimpan.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Label Field"
              placeholder="Contoh: Nomor Telepon"
              value={fieldLabel}
              onChange={(e) => {
                setFieldLabel(e.target.value);
                if (!editingField && !fieldKey) setFieldKey(slugify(e.target.value));
              }}
              required
            />
            <Input
              label="Kunci Field (Key)"
              placeholder="nomor_telepon"
              value={fieldKey}
              disabled={Boolean(editingField)}
              onChange={(e) => setFieldKey(slugify(e.target.value))}
              helperText={editingField ? "Terkunci" : "Nama atribut di JSON / Kolom"}
              required
            />
          </div>

          <SelectBox
            label="Tipe Field"
            value={fieldType}
            onChange={(opt) => setFieldType(opt.value)}
            options={FIELD_TYPES}
            disabled={Boolean(editingField)}
          />

          {/* Type specific config options */}
          {['select', 'multiselect'].includes(fieldType) && (
            <Input
              label="Pilihan Opsi (Pisahkan dengan Koma)"
              placeholder="Merah, Kuning, Hijau"
              value={fieldChoicesDraft}
              onChange={(e) => setFieldChoicesDraft(e.target.value)}
              helperText="Masukkan daftar opsi yang dapat dipilih pengguna"
              required
            />
          )}

          {['relation', 'relation_many'].includes(fieldType) && (
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectBox
                label="Target Entitas Relasi"
                value={fieldRelationTarget}
                onChange={(opt) => setFieldRelationTarget(opt.value)}
                options={entities.filter((e) => e.slug !== selectedEntityForFields?.slug).map((e) => ({ value: e.slug, label: `${e.label_plural} (${e.slug})` }))}
                placeholder="Pilih target..."
              />
              <Input
                label="Field Tampilan (Display Key)"
                placeholder="name / title / label"
                value={fieldRelationDisplay}
                onChange={(e) => setFieldRelationDisplay(e.target.value)}
                helperText="Field yang akan ditampilkan sebagai teks dropdown"
              />
            </div>
          )}

          {fieldType === 'number' && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label="Nilai Minimal (Min)"
                type="number"
                value={fieldMinNumber}
                onChange={(e) => setFieldMinNumber(e.target.value)}
              />
              <Input
                label="Nilai Maksimal (Max)"
                type="number"
                value={fieldMaxNumber}
                onChange={(e) => setFieldMaxNumber(e.target.value)}
              />
              <label className="flex cursor-pointer items-center gap-2 pt-6 text-sm">
                <input
                  type="checkbox"
                  checked={fieldIntegerOnly}
                  onChange={(e) => setFieldIntegerOnly(e.target.checked)}
                  className="rounded text-primary-600"
                />
                <span>Hanya Bilangan Bulat</span>
              </label>
            </div>
          )}

          {fieldType === 'text' && (
            <Input
              label="Regex Pattern Validasi (Opsional)"
              placeholder="Contoh: ^[A-Z0-9-]+$"
              value={fieldPattern}
              onChange={(e) => setFieldPattern(e.target.value)}
            />
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Placeholder (Petunjuk Input)"
              placeholder="Contoh: Masukkan email aktif..."
              value={fieldPlaceholder}
              onChange={(e) => setFieldPlaceholder(e.target.value)}
            />
            <Input
              label="Teks Bantuan (Help Text)"
              placeholder="Contoh: Pastikan sesuai dengan KTP..."
              value={fieldHelpText}
              onChange={(e) => setFieldHelpText(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-text-body">
              <input
                type="checkbox"
                checked={fieldRequired}
                onChange={(e) => setFieldRequired(e.target.checked)}
                className="rounded text-primary-600"
              />
              <span>Wajib Diisi (Required)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-text-body">
              <input
                type="checkbox"
                checked={fieldUnique}
                onChange={(e) => setFieldUnique(e.target.checked)}
                className="rounded text-primary-600"
              />
              <span>Nilai Unik (Unique)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-text-body">
              <input
                type="checkbox"
                checked={fieldListVisible}
                onChange={(e) => setFieldListVisible(e.target.checked)}
                className="rounded text-primary-600"
              />
              <span>Tampil di Tabel</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-text-body">
              <input
                type="checkbox"
                checked={fieldFormVisible}
                onChange={(e) => setFieldFormVisible(e.target.checked)}
                className="rounded text-primary-600"
              />
              <span>Tampil di Form Input</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
            <Button type="button" variant="secondary" onClick={() => setFieldModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" isLoading={isSavingField}>
              {editingField ? 'Simpan Perubahan' : 'Tambah Field'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Entity Dialog */}
      <ConfirmDialog
        open={Boolean(deletingEntity)}
        title={`Hapus Entitas: ${deletingEntity?.label}?`}
        description={
          deletingEntity?.source_table
            ? `Entitas terikat '${deletingEntity?.label}' akan dihapus dari skema dinamis. Tabel asli '${deletingEntity?.source_schema || 'public'}.${deletingEntity?.source_table}' di database akan tetap aman dan tidak terhapus.`
            : `Seluruh rekaman dokumen dan field untuk entitas '${deletingEntity?.label}' akan dihapus permanen.`
        }
        onCancel={() => setDeletingEntity(null)}
        onConfirm={confirmDeleteEntity}
      />

      {/* Delete Field Dialog */}
      <ConfirmDialog
        open={Boolean(deletingField)}
        title={`Hapus Field: ${deletingField?.label}?`}
        description={`Nilai field '${deletingField?.label}' (${deletingField?.key}) pada semua baris data yang ada akan dibersihkan.`}
        onCancel={() => setDeletingField(null)}
        onConfirm={confirmDeleteField}
      />
    </div>
  );
}
