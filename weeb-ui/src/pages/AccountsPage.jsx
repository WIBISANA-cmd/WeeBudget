import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { z } from 'zod';
import CrudResourcePage from '../features/shared/CrudResourcePage';
import { configs } from '../features/shared/crudConfigs';
import { useAccountOptions } from '../hooks/useAccountOptions';
import { resourcesApi } from '../api/resources';
import { apiGet } from '../api/http';
import Button from '../components/ui/Button';
import Modal from '../components/forms/Modal';
import { Card, CardContent } from '../components/ui/Card';
import { formatCurrency } from '../lib/formatters';
import LoadingSkeleton from '../components/feedback/LoadingSkeleton';
import { refreshPageQuickly } from '../lib/pageRefresh';

const ResourceForm = lazy(() => import('../components/forms/ResourceForm'));

const allocationSchema = z.object({
  source_account_id: z.coerce.number().min(1, 'Rekening sumber wajib dipilih'),
  destination_account_id: z.coerce.number().min(1, 'Rekening tujuan wajib dipilih'),
  amount: z.coerce.number().positive('Nominal alokasi harus lebih dari 0'),
  transaction_date: z.string().min(1, 'Tanggal alokasi wajib diisi'),
  notes: z.string().optional(),
}).refine((values) => values.source_account_id !== values.destination_account_id, {
  path: ['destination_account_id'],
  message: 'Rekening tujuan harus berbeda dari rekening sumber.',
});

const allocationFields = [
  {
    name: 'source_account_id',
    label: 'Rekening Sumber',
    type: 'select',
    optionsKey: 'accounts',
    placeholder: 'Pilih rekening sumber dana',
  },
  {
    name: 'destination_account_id',
    label: 'Rekening Tujuan',
    type: 'select',
    optionsKey: 'accounts',
    placeholder: 'Pilih rekening tujuan alokasi',
    getOptions: ({ options, values }) => options.filter((account) => String(account.value) !== String(values?.source_account_id || '')),
  },
  {
    name: 'amount',
    label: 'Nominal Alokasi',
    type: 'number',
    valueAsNumber: true,
    placeholder: 'Contoh: 500000',
  },
  {
    name: 'transaction_date',
    label: 'Tanggal Alokasi',
    type: 'date',
    placeholder: 'Pilih tanggal alokasi',
  },
  {
    name: 'notes',
    label: 'Catatan',
    type: 'textarea',
    full: true,
    placeholder: 'Contoh: Pindah dana gaji ke tabungan',
  },
];

export default function AccountsPage() {
  const [isAllocationOpen, setAllocationOpen] = useState(false);
  const [isSavingAllocation, setSavingAllocation] = useState(false);
  const [pageVersion, setPageVersion] = useState(0);
  const [plannerPreview, setPlannerPreview] = useState(null);
  const [plannerPreviewError, setPlannerPreviewError] = useState(null);
  const [allocationPreviewAmount, setAllocationPreviewAmount] = useState('');
  const accountOptions = useAccountOptions({ includeInactive: true });
  const allAccounts = useMemo(() => accountOptions.accounts || [], [accountOptions.accounts]);
  const allocationOptions = useMemo(() => ({
    accounts: allAccounts,
  }), [allAccounts]);
  const totalTrackedBalance = useMemo(
    () => allAccounts.reduce((total, account) => total + Number(account.balance || 0), 0),
    [allAccounts]
  );
  const purposeCount = useMemo(() => new Set(allAccounts.map((account) => account.purpose).filter(Boolean)).size, [allAccounts]);

  const defaultAllocationValues = useMemo(() => {
    const salaryAccount = allAccounts.find((account) => account.purpose === 'salary');
    const sourceAccount = salaryAccount || allAccounts[0] || null;
    const destinationAccount = allAccounts.find((account) => String(account.value) !== String(sourceAccount?.value || '')) || null;

    return {
      source_account_id: sourceAccount?.value || '',
      destination_account_id: destinationAccount?.value || '',
      amount: '',
      transaction_date: new Date().toISOString().slice(0, 10),
      notes: '',
    };
  }, [allAccounts]);

  useEffect(() => {
    if (!isAllocationOpen) return;

    const numericAmount = Number(allocationPreviewAmount || 0);

    if (!numericAmount) {
      setPlannerPreview(null);
      setPlannerPreviewError(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      queueMicrotask(async () => {
        try {
          const response = await apiGet('/budget-planner', { base_amount: numericAmount });
          setPlannerPreview(response.data || null);
          setPlannerPreviewError(null);
        } catch (error) {
          setPlannerPreview(null);
          setPlannerPreviewError(error.response?.data?.message || 'Preview budget planner belum bisa dimuat.');
        }
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [allocationPreviewAmount, isAllocationOpen]);

  useEffect(() => {
    if (!isAllocationOpen) {
      setPlannerPreview(null);
      setPlannerPreviewError(null);
      setAllocationPreviewAmount('');
    }
  }, [isAllocationOpen]);

  const submitAllocation = async (values) => {
    setSavingAllocation(true);
    try {
      await resourcesApi.create('/account-allocations', {
        ...values,
        notes: values.notes || null,
      });
      await accountOptions.reloadAccounts?.();
      setAllocationOpen(false);
      setPageVersion((current) => current + 1);
      refreshPageQuickly();
    } catch (error) {
      const message = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat()[0]
        : error.response?.data?.message || 'Alokasi dana belum bisa disimpan.';
      alert(message);
    } finally {
      setSavingAllocation(false);
    }
  };

  return (
    <div className="space-y-6">
      <CrudResourcePage
        key={pageVersion}
        config={{ ...configs.accounts, noCard: true }}
        topContent={(
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr_0.9fr]">
            <Card className="border-primary-500/20 bg-gradient-to-br from-primary-500/8 via-surface-panel to-surface-panel">
              <CardContent className="space-y-3">
                <p className="text-sm font-medium text-text-muted">Total saldo terpantau</p>
                <p className="text-3xl font-semibold tracking-tight text-text-title">{formatCurrency(totalTrackedBalance)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2">
                <p className="text-sm font-medium text-text-muted">Rekening aktif</p>
                <p className="text-3xl font-semibold tracking-tight text-text-title">{allAccounts.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2">
                <p className="text-sm font-medium text-text-muted">Pos uang terpakai</p>
                <p className="text-3xl font-semibold tracking-tight text-text-title">{purposeCount}</p>
              </CardContent>
            </Card>
          </div>
        )}
        headerActions={(
          <Button
            variant="secondary"
            onClick={() => setAllocationOpen(true)}
            disabled={allAccounts.length < 2}
          >
            <ArrowRightLeft size={18} className="mr-2" />
            Alokasi Dana
          </Button>
        )}
      />

      <Modal
        open={isAllocationOpen}
        onClose={() => setAllocationOpen(false)}
        title="Alokasi Dana"
        description="Pindahkan nominal dari satu rekening ke rekening lain tanpa mengubah saldo secara manual."
        fullScreenOnMobile={true}
      >
        {plannerPreview && (
          <Card className="mb-4 border-primary-500/25 bg-gradient-to-br from-primary-500/8 via-surface-panel to-surface-panel">
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm text-text-muted">Acuan nominal dari Budget Planner</p>
                  <p className="mt-1 text-lg font-semibold text-text-title">
                    Dana dasar {formatCurrency(plannerPreview.base_amount || 0)}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    Planner ini dihitung dari nominal alokasi yang kamu input di form, bukan dari total seluruh saldo rekening.
                  </p>
                </div>
                <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  plannerPreview.has_custom_allocations
                    ? 'bg-success-base/10 text-success-base'
                    : 'bg-info-base/10 text-info-base'
                }`}>
                  {plannerPreview.has_custom_allocations ? 'Menggunakan custom planner tersimpan' : 'Menggunakan planner rekomendasi default'}
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {(plannerPreview.allocations || []).map((item) => (
                  <div key={item.key} className="rounded-2xl bg-surface-panel p-4 shadow-sm shadow-card-soft">
                    <p className="text-sm text-text-muted">{item.label}</p>
                    <p className="mt-1 text-lg font-semibold text-primary-600">{formatCurrency(item.amount)}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      {plannerPreview.has_custom_allocations ? 'Custom tersimpan' : 'Rekomendasi default'}: {item.percent}% dari dana dasar
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {plannerPreviewError && (
          <Card className="mb-4 border-warning-base bg-warning-base/5">
            <CardContent>
              <p className="text-sm font-medium text-warning-base">{plannerPreviewError}</p>
            </CardContent>
          </Card>
        )}
        <Suspense fallback={<LoadingSkeleton rows={4} />}>
          <ResourceForm
            schema={allocationSchema}
            fields={allocationFields}
            defaultValues={defaultAllocationValues}
            options={allocationOptions}
            isSaving={isSavingAllocation}
            submitLabel="Simpan alokasi"
            onValuesChange={(values) => setAllocationPreviewAmount(values?.amount || '')}
            onSubmit={submitAllocation}
          />
        </Suspense>
        {!plannerPreview && !plannerPreviewError && (
          <p className="mt-3 text-sm text-text-muted">
            Masukkan nominal alokasi terlebih dahulu untuk melihat pembagian planner berdasarkan nominal tersebut.
          </p>
        )}
        {allAccounts.length < 2 && (
          <p className="mt-3 text-sm text-danger-base">
            Tambahkan minimal dua rekening aktif agar alokasi dana bisa dilakukan.
          </p>
        )}
      </Modal>
    </div>
  );
}
