import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Download, Upload, FileSpreadsheet, Pencil, Trash2, 
  RefreshCw, Filter, ArrowUpDown, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2 
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
  fetchSchema, fetchDynamicData, createDynamicRecord, 
  updateDynamicRecord, deleteDynamicRecord, importDynamicCsv, 
  getExportCsvUrl, getCsvTemplateUrl 
} from '../../api/dynamicSchema';
import { cn } from '../../lib/utils';

export default function DynamicCrudRuntimePage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [schema, setSchema] = useState(null);
  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 20 });
  const [isLoadingSchema, setIsLoadingSchema] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState(null);

  // Search, filter, pagination, sort
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);

  // Form modal (Create / Edit)
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // CSV Import Modal
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Relation target options map: slug -> array of {value, label}
  const [relationOptions, setRelationOptions] = useState({});

  // 1. Load schema metadata
  const loadSchema = async () => {
    try {
      setIsLoadingSchema(true);
      setError(null);
      const data = await fetchSchema(slug);
      setSchema(data);

      // Load relation target options
      const relationFields = (data.fields || []).filter((f) => ['relation', 'relation_many'].includes(f.type));
      relationFields.forEach(async (f) => {
        const targetSlug = f.options?.relation?.entity;
        const displayKey = f.options?.relation?.display || 'name';
        if (targetSlug) {
          try {
            const targetRes = await fetchDynamicData(targetSlug, { pageSize: 100 });
            const items = (targetRes.data || []).map((item) => ({
              value: String(item.id),
              label: String(item[displayKey] || item.label || item.name || item.title || item.id),
            }));
            setRelationOptions((prev) => ({ ...prev, [targetSlug]: items }));
          } catch {
            // Silently ignore target load failure
          }
        }
      });
    } catch (err) {
      setError(err.response?.data?.message || `Gagal memuat skema untuk entitas '${slug}'.`);
    } finally {
      setIsLoadingSchema(false);
    }
  };

  useEffect(() => {
    loadSchema();
    setPage(1);
    setSearchTerm('');
    setFilters({});
  }, [slug]);

  // 2. Load dynamic data
  const loadData = async () => {
    if (!schema) return;
    try {
      setIsLoadingData(true);
      const queryParams = {
        page,
        pageSize: 20,
        sort: sortKey || undefined,
        dir: sortDir,
      };

      if (searchTerm.trim() && schema.features?.includes('search')) {
        queryParams.search = searchTerm.trim();
      }

      if (schema.features?.includes('filter')) {
        Object.entries(filters).forEach(([k, v]) => {
          if (v !== '' && v !== null && v !== undefined) {
            queryParams[`f_${k}`] = v;
          }
        });
      }

      const res = await fetchDynamicData(slug, queryParams);
      setRecords(res.data || []);
      if (res.meta) {
        setMeta(res.meta);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data.');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (schema) {
      loadData();
    }
  }, [schema, page, sortKey, sortDir, filters]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Form handling
  const openCreateModal = () => {
    const initial = {};
    (schema?.fields || []).forEach((f) => {
      if (f.default_value !== null && f.default_value !== undefined) {
        initial[f.key] = f.default_value;
      } else if (f.type === 'boolean') {
        initial[f.key] = false;
      } else if (['multiselect', 'relation_many'].includes(f.type)) {
        initial[f.key] = [];
      } else {
        initial[f.key] = '';
      }
    });

    setFormData(initial);
    setFormErrors({});
    setEditingRecord(null);
    setFormOpen(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    const initial = {};
    (schema?.fields || []).forEach((f) => {
      initial[f.key] = record[f.key] ?? '';
    });

    setFormData(initial);
    setFormErrors({});
    setFormOpen(true);
  };

  const handleFormChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (formErrors[key]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const saveRecord = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFormErrors({});

    try {
      if (editingRecord) {
        await updateDynamicRecord(slug, editingRecord.id, formData);
      } else {
        await createDynamicRecord(slug, formData);
      }
      setFormOpen(false);
      loadData();
    } catch (err) {
      if (err.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      } else {
        alert(err.response?.data?.message || 'Gagal menyimpan data.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteRecord = async () => {
    if (!deletingRecord) return;
    setIsDeleting(true);
    try {
      await deleteDynamicRecord(slug, deletingRecord.id);
      setDeletingRecord(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus data.');
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV Import handling
  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile && !importText.trim()) {
      return alert('Pilih file CSV atau tempel teks CSV.');
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      let data;
      if (importFile) {
        const fd = new FormData();
        fd.append('file', importFile);
        data = await importDynamicCsv(slug, fd);
      } else {
        data = await importDynamicCsv(slug, importText);
      }
      setImportResult(data);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memproses impor CSV.');
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoadingSchema) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  if (error && !schema) {
    return (
      <ErrorState
        title="Gagal Memuat Entitas"
        message={error}
        onRetry={loadSchema}
      />
    );
  }

  const listFields = (schema?.fields || []).filter((f) => f.list_visible);
  const formFields = (schema?.fields || []).filter((f) => f.form_visible);
  const filterableFields = (schema?.fields || []).filter((f) => ['select', 'boolean'].includes(f.type));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary-600">
            <DynamicIcon name={schema?.icon} size={24} />
            <h1 className="text-2xl font-bold text-text-title md:text-3xl">
              {schema?.label_plural || schema?.label}
            </h1>
          </div>
          {schema?.description && (
            <p className="mt-2 text-sm leading-6 text-text-muted">{schema.description}</p>
          )}
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {schema?.features?.includes('export') && (
            <Button
              variant="secondary"
              onClick={() => {
                const url = getExportCsvUrl(slug, searchTerm, filters);
                window.open(url, '_blank');
              }}
              title="Ekspor data saat ini ke CSV"
            >
              <Download size={17} className="mr-2" />
              Ekspor CSV
            </Button>
          )}

          {schema?.features?.includes('import') && (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setImportFile(null);
                  setImportText('');
                  setImportResult(null);
                  setImportModalOpen(true);
                }}
                title="Impor baris data dari CSV"
              >
                <Upload size={17} className="mr-2" />
                Impor CSV
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const url = getCsvTemplateUrl(slug);
                  window.open(url, '_blank');
                }}
                title="Unduh template CSV kosong"
              >
                <FileSpreadsheet size={17} className="mr-2" />
                Template
              </Button>
            </>
          )}

          {schema?.features?.includes('create') && (
            <Button onClick={openCreateModal}>
              <Plus size={18} className="mr-2" />
              Tambah {schema?.label}
            </Button>
          )}
        </div>
      </header>

      {/* Search & Filters Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-panel p-4 shadow-sm shadow-card-soft md:flex-row md:items-center md:justify-between">
        {schema?.features?.includes('search') ? (
          <form onSubmit={handleSearchSubmit} className="flex min-w-[280px] flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder={`Cari di ${schema?.label_plural}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-border-subtle bg-surface-panel py-2 pl-9 pr-3 text-sm text-text-title shadow-sm placeholder:text-text-muted focus:border-primary-500 focus:outline-none"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary">Cari</Button>
          </form>
        ) : (
          <div />
        )}

        {schema?.features?.includes('filter') && filterableFields.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {filterableFields.map((field) => {
              let options = [{ value: '', label: `Semua ${field.label}` }];
              if (field.type === 'boolean') {
                options.push({ value: 'true', label: 'Ya' }, { value: 'false', label: 'Tidak' });
              } else if (Array.isArray(field.options?.choices)) {
                options = options.concat(field.options.choices.map((c) => ({ value: String(c), label: String(c) })));
              }

              return (
                <div key={field.key} className="w-40">
                  <SelectBox
                    value={filters[field.key] ?? ''}
                    onChange={(opt) => setFilters((prev) => ({ ...prev, [field.key]: opt.value }))}
                    options={options}
                    placeholder={`Filter ${field.label}`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Records Table */}
      {isLoadingData ? (
        <LoadingSkeleton rows={6} />
      ) : records.length === 0 ? (
        <EmptyState
          title={`Belum ada data ${schema?.label_plural}`}
          description={searchTerm ? 'Tidak ada baris data yang cocok dengan kata kunci pencarian.' : `Mulai tambahkan baris data baru untuk modul ${schema?.label}.`}
          action={schema?.features?.includes('create') && <Button onClick={openCreateModal}><Plus size={18} className="mr-2" />Tambah {schema?.label}</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-border-subtle bg-surface-panel shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-subtle text-left text-sm">
              <thead className="bg-surface-100/90 text-xs font-semibold uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-5 py-3.5 w-16">#</th>
                  {listFields.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="cursor-pointer px-5 py-3.5 hover:text-text-title"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.label}</span>
                        <ArrowUpDown size={13} className={cn('opacity-40', sortKey === col.key && 'opacity-100 text-primary-600')} />
                      </div>
                    </th>
                  ))}
                  {(schema?.features?.includes('edit') || schema?.features?.includes('delete')) && (
                    <th className="px-5 py-3.5 text-right w-24">Aksi</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-surface-panel">
                {records.map((row, index) => {
                  const rowNumber = (meta.current_page - 1) * meta.per_page + (index + 1);

                  return (
                    <tr key={row.id} className="ui-hover-surface transition-colors">
                      <td className="px-5 py-4 font-mono text-xs text-text-muted">{rowNumber}</td>
                      {listFields.map((col) => {
                        const rawVal = row[col.key];

                        return (
                          <td key={col.key} className="px-5 py-4 align-middle text-text-body">
                            {renderCellContent(col, rawVal, relationOptions)}
                          </td>
                        );
                      })}

                      {(schema?.features?.includes('edit') || schema?.features?.includes('delete')) && (
                        <td className="px-5 py-4 text-right align-middle">
                          <div className="flex justify-end gap-1.5">
                            {schema?.features?.includes('edit') && (
                              <button
                                onClick={() => openEditModal(row)}
                                className="rounded-xl border border-border-subtle p-2 text-text-muted hover:border-primary-500 hover:text-primary-600"
                                aria-label="Edit baris"
                                title="Edit"
                              >
                                <Pencil size={15} />
                              </button>
                            )}
                            {schema?.features?.includes('delete') && (
                              <button
                                onClick={() => setDeletingRecord(row)}
                                className="rounded-xl border border-border-subtle p-2 text-danger-base hover:border-danger-base hover:bg-danger-base/10"
                                aria-label="Hapus baris"
                                title="Hapus"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-border-subtle px-5 py-3 text-xs text-text-muted">
            <span>Menampilkan total {meta.total} baris data</span>
            <div className="flex items-center gap-2">
              <span>Halaman {meta.current_page} dari {meta.last_page}</span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={meta.current_page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={meta.current_page >= meta.last_page}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal (Create / Edit) */}
      <Modal
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        title={editingRecord ? `Edit ${schema?.label}` : `Tambah ${schema?.label}`}
        description={`Lengkapi field di bawah ini untuk ${editingRecord ? 'memperbarui' : 'menyimpan'} data.`}
      >
        <form onSubmit={saveRecord} className="space-y-4">
          {formFields.map((field) => {
            const err = formErrors[field.key]?.[0];
            return (
              <div key={field.key}>
                {renderFormField(field, formData[field.key], handleFormChange, err, relationOptions)}
              </div>
            );
          })}

          <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingRecord ? 'Simpan Perubahan' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Record Dialog */}
      <ConfirmDialog
        open={Boolean(deletingRecord)}
        title={`Hapus data ${schema?.label}?`}
        description="Baris data ini akan dihapus secara permanen dari sistem."
        onCancel={() => setDeletingRecord(null)}
        onConfirm={confirmDeleteRecord}
        isLoading={isDeleting}
      />

      {/* CSV Import Modal */}
      <Modal
        open={isImportModalOpen}
        onClose={() => setImportModalOpen(false)}
        title={`Impor Massal: ${schema?.label_plural}`}
        description="Unggah berkas CSV atau tempel teks CSV dengan format header yang sesuai."
      >
        <form onSubmit={handleImportSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-text-body">Unggah Berkas CSV:</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="w-full rounded-xl border border-border-subtle bg-surface-panel p-2.5 text-sm text-text-title file:mr-4 file:rounded-lg file:border-0 file:bg-primary-500/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-body">Atau Tempel Teks CSV:</label>
            <textarea
              rows={4}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="nama,harga,stok&#10;Produk A,10000,true"
              className="w-full rounded-xl border border-border-subtle bg-surface-panel p-3 font-mono text-xs text-text-title focus:border-primary-500 focus:outline-none"
            />
          </div>

          {importResult && (
            <div className={cn('rounded-xl p-4 text-xs', importResult.failed > 0 ? 'bg-warning-base/10 border border-warning-base/30' : 'bg-success-base/10 border border-success-base/30')}>
              <p className="font-semibold text-text-title">
                Hasil Impor: {importResult.imported} berhasil, {importResult.failed} gagal.
              </p>
              {importResult.errors?.length > 0 && (
                <div className="mt-2 max-h-36 overflow-y-auto space-y-1">
                  {importResult.errors.map((err, idx) => (
                    <p key={idx} className="text-danger-base">
                      • Baris {err.row}: {err.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-border-subtle">
            <Button type="button" variant="secondary" onClick={() => setImportModalOpen(false)}>
              Tutup
            </Button>
            <Button type="submit" isLoading={isImporting}>
              Mulai Impor
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Cell Content Renderer for Table Columns                            */
/* ------------------------------------------------------------------ */
function renderCellContent(field, value, relationOptions) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-text-muted">-</span>;
  }

  if (field.type === 'boolean') {
    return (
      <StatusBadge value={value ? 'active' : 'safe'}>
        {value ? 'Ya' : 'Tidak'}
      </StatusBadge>
    );
  }

  if (field.type === 'number') {
    return (
      <span className="font-mono font-medium">
        {new Intl.NumberFormat('id-ID').format(value)}
      </span>
    );
  }

  if (field.type === 'relation') {
    const targetSlug = field.options?.relation?.entity;
    const targetOpts = relationOptions[targetSlug] || [];
    const matched = targetOpts.find((o) => String(o.value) === String(value));
    return <span className="font-medium text-primary-600">{matched?.label || value}</span>;
  }

  if (field.type === 'relation_many' && Array.isArray(value)) {
    const targetSlug = field.options?.relation?.entity;
    const targetOpts = relationOptions[targetSlug] || [];
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((id) => {
          const matched = targetOpts.find((o) => String(o.value) === String(id));
          return (
            <span key={id} className="rounded-full bg-primary-500/10 px-2 py-0.5 text-xs text-primary-700">
              {matched?.label || id}
            </span>
          );
        })}
      </div>
    );
  }

  if (field.type === 'multiselect' && Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((item, idx) => (
          <span key={idx} className="rounded-full bg-surface-200 px-2 py-0.5 text-xs font-medium text-text-body">
            {item}
          </span>
        ))}
      </div>
    );
  }

  if (field.type === 'richtext') {
    return (
      <div 
        className="prose prose-xs max-w-xs truncate text-xs text-text-muted" 
        dangerouslySetInnerHTML={{ __html: String(value) }} 
      />
    );
  }

  if (field.type === 'url') {
    return (
      <a 
        href={value} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="inline-flex items-center gap-1 font-medium text-primary-600 hover:underline"
      >
        <span className="max-w-[160px] truncate">{value}</span>
      </a>
    );
  }

  if (field.type === 'email') {
    return <a href={`mailto:${value}`} className="text-primary-600 hover:underline">{value}</a>;
  }

  return <span className="truncate">{String(value)}</span>;
}

/* ------------------------------------------------------------------ */
/*  Form Field Renderer for all 14 Dynamic Field Types                 */
/* ------------------------------------------------------------------ */
function renderFormField(field, value, onChange, error, relationOptions) {
  const labelWithRequired = `${field.label}${field.is_required ? ' *' : ''}`;

  if (field.type === 'textarea') {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-body">{labelWithRequired}</label>
        <textarea
          rows={3}
          value={value ?? ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder || ''}
          className={cn(
            'w-full rounded-xl border border-border-subtle bg-surface-panel px-4 py-3 text-sm text-text-title shadow-sm focus:border-primary-500 focus:outline-none',
            error && 'border-danger-base'
          )}
        />
        {field.help_text && <p className="text-xs text-text-muted">{field.help_text}</p>}
        {error && <p className="text-xs font-medium text-danger-base">{error}</p>}
      </div>
    );
  }

  if (field.type === 'richtext') {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-body">{labelWithRequired}</label>
        <textarea
          rows={5}
          value={value ?? ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder || 'HTML / Teks terformat...'}
          className={cn(
            'w-full font-mono rounded-xl border border-border-subtle bg-surface-panel px-4 py-3 text-sm text-text-title shadow-sm focus:border-primary-500 focus:outline-none',
            error && 'border-danger-base'
          )}
        />
        <p className="text-xs text-text-muted">Mendukung format tag HTML seperti &lt;b&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;a&gt;. Sanitasi allowlist aktif.</p>
        {error && <p className="text-xs font-medium text-danger-base">{error}</p>}
      </div>
    );
  }

  if (field.type === 'boolean') {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border-subtle bg-surface-100/60 p-3">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(field.key, e.target.checked)}
            className="h-4 w-4 rounded text-primary-600"
          />
          <span className="text-sm font-medium text-text-body">{labelWithRequired}</span>
        </label>
        {field.help_text && <p className="text-xs text-text-muted">{field.help_text}</p>}
        {error && <p className="text-xs font-medium text-danger-base">{error}</p>}
      </div>
    );
  }

  if (field.type === 'select') {
    const rawChoices = field.options?.choices || [];
    const selectOptions = rawChoices.map((c) => ({
      value: typeof c === 'object' ? c.value : String(c),
      label: typeof c === 'object' ? c.label : String(c),
    }));

    return (
      <SelectBox
        label={labelWithRequired}
        value={value ?? ''}
        onChange={(opt) => onChange(field.key, opt.value)}
        options={selectOptions}
        placeholder={field.placeholder || 'Pilih opsi...'}
        error={error}
      />
    );
  }

  if (field.type === 'multiselect') {
    const rawChoices = field.options?.choices || [];
    const currentValues = Array.isArray(value) ? value : [];

    const toggleChoice = (choiceVal) => {
      const exists = currentValues.includes(choiceVal);
      const next = exists ? currentValues.filter((v) => v !== choiceVal) : [...currentValues, choiceVal];
      onChange(field.key, next);
    };

    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-body">{labelWithRequired}</label>
        <div className="flex flex-wrap gap-2 rounded-xl border border-border-subtle bg-surface-panel p-3">
          {rawChoices.map((choice) => {
            const choiceVal = typeof choice === 'object' ? choice.value : String(choice);
            const choiceLabel = typeof choice === 'object' ? choice.label : String(choice);
            const isSelected = currentValues.includes(choiceVal);

            return (
              <button
                key={choiceVal}
                type="button"
                onClick={() => toggleChoice(choiceVal)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-all',
                  isSelected
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-surface-100 text-text-muted hover:bg-surface-200 hover:text-text-title'
                )}
              >
                {choiceLabel}
              </button>
            );
          })}
        </div>
        {field.help_text && <p className="text-xs text-text-muted">{field.help_text}</p>}
        {error && <p className="text-xs font-medium text-danger-base">{error}</p>}
      </div>
    );
  }

  if (field.type === 'relation') {
    const targetSlug = field.options?.relation?.entity;
    const targetOptions = relationOptions[targetSlug] || [];

    return (
      <SelectBox
        label={labelWithRequired}
        value={value ?? ''}
        onChange={(opt) => onChange(field.key, opt.value)}
        options={targetOptions}
        placeholder={field.placeholder || `Pilih dari ${targetSlug || 'relasi'}...`}
        error={error}
      />
    );
  }

  if (field.type === 'relation_many') {
    const targetSlug = field.options?.relation?.entity;
    const targetOptions = relationOptions[targetSlug] || [];
    const currentIds = Array.isArray(value) ? value : [];

    const toggleRelationId = (id) => {
      const exists = currentIds.includes(id);
      const next = exists ? currentIds.filter((v) => v !== id) : [...currentIds, id];
      onChange(field.key, next);
    };

    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-body">{labelWithRequired}</label>
        <div className="flex flex-wrap gap-2 rounded-xl border border-border-subtle bg-surface-panel p-3">
          {targetOptions.map((opt) => {
            const isSelected = currentIds.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleRelationId(opt.value)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-all',
                  isSelected
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-surface-100 text-text-muted hover:bg-surface-200 hover:text-text-title'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {field.help_text && <p className="text-xs text-text-muted">{field.help_text}</p>}
        {error && <p className="text-xs font-medium text-danger-base">{error}</p>}
      </div>
    );
  }

  const inputType = {
    number: 'number',
    date: 'date',
    datetime: 'datetime-local',
    email: 'email',
    url: 'url',
    file: 'text',
  }[field.type] || 'text';

  return (
    <Input
      label={labelWithRequired}
      type={inputType}
      value={value ?? ''}
      onChange={(e) => onChange(field.key, e.target.value)}
      placeholder={field.placeholder || ''}
      helperText={field.help_text || ''}
      error={error}
    />
  );
}
