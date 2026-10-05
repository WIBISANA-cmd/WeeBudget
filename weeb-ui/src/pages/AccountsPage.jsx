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
import { FormSkeleton, Skeleton } from '../components/feedback/LoadingSkeleton';

const ResourceForm = lazy(() => import('../components/forms/ResourceForm'));
const calculateAllocationAmount = (baseAmount, percent) => Math.floor((Number(baseAmount || 0) * Number(percent || 0)) / 100);

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

const previewTileClass = 'rounded-xl border border-border-subtle bg-surface-panel p-3';

export default function AccountsPage() {
  const [isAllocationOpen, setAllocationOpen] = useState(false);
  const [isSavingAllocation, setSavingAllocation] = useState(false);
  const [pageVersion, setPageVersion] = useState(0);
  const [plannerPreview, setPlannerPreview] = useState(null);
  const [plannerPreviewError, setPlannerPreviewError] = useState(null);
  const accountOptions = useAccountOptions({ includeInactive: true });
  const allAccounts = useMemo(() => accountOptions.accounts || [], [accountOptions.accounts]);
  const allocationOptions = useMemo(() => ({
    accounts: allAccounts,
  }), [allAccounts]);
  const totalTrackedBalance = useMemo(
    () => allAccounts.reduce((total, account) => total + Number(account.balance || 0), 0),
    [allAccounts]
  );

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

  const loadPlannerPreview = async (baseAmount = 0) => {
    try {
      const response = await apiGet('/budget-planner', { base_amount: baseAmount });
      setPlannerPreview(response.data || null);
      setPlannerPreviewError(null);
    } catch (error) {
      setPlannerPreview(null);
      setPlannerPreviewError(error.response?.data?.message || 'Preview budget planner belum bisa dimuat.');
    }
  };

  useEffect(() => {
    if (!isAllocationOpen) return;
    queueMicrotask(() => {
      loadPlannerPreview(0);
    });
  }, [isAllocationOpen]);

  useEffect(() => {
    if (!isAllocationOpen) {
      setPlannerPreview(null);
      setPlannerPreviewError(null);
    }
  }, [isAllocationOpen]);

  const submitAllocation = async (values) => {
    setSavingAllocation(true);
    try {
      await resourcesApi.create('/account-allocations', {
        ...values,
        notes: values.notes || null,
      });
      setAllocationOpen(false);
      setPageVersion((current) => current + 1);
    } catch (error) {
      const message = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat()[0]
        : error.response?.data?.message || 'Alokasi dana belum bisa disimpan.';
      alert(message);
    } finally {
      setSavingAllocation(false);
    }
  };

  const activePreviewBaseAmount = Number(plannerPreview?.saved_base_amount || 0);
  const isPreviewLoading = !plannerPreview && !plannerPreviewError;

  return (
    <>
      <CrudResourcePage
        key={pageVersion}
        config={{ ...configs.accounts, title: 'Rekening', noCard: true }}
        topContent={(
          <Card>
            <CardContent className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
              <div>
                <p className="text-sm text-text-muted">Total saldo</p>
                <p className="mt-1 font-outfit text-3xl font-semibold tabular-nums text-text-title">{formatCurrency(totalTrackedBalance)}</p>
              </div>
              <p className="text-sm text-text-muted">{allAccounts.length} rekening</p>
            </CardContent>
          </Card>
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
        fullScreenOnMobile={true}
      >
        {/* The planner split for the saved base amount, as a guide for how much to move where. */}
        {isPreviewLoading && (
          <div className="mb-4 rounded-2xl bg-surface-100 p-3">
            <Skeleton className="h-4 w-56 max-w-full" />
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className={previewTileClass}>
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="mt-2 h-5 w-28" />
                </div>
              ))}
            </div>
          </div>
        )}
        {plannerPreview && (
          <div className="mb-4 rounded-2xl bg-surface-100 p-3">
            <p className="text-sm text-text-muted">
              Panduan planner dari dana dasar{' '}
              <span className="font-semibold text-text-title">{formatCurrency(activePreviewBaseAmount || 0)}</span>
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {(plannerPreview.allocations || []).map((item) => (
                <div key={item.key} className={previewTileClass}>
                  <p className="text-sm text-text-muted">{item.label} · {item.percent}%</p>
                  <p className="mt-1 text-base font-semibold tabular-nums text-text-title">
                    {formatCurrency(calculateAllocationAmount(activePreviewBaseAmount, item.percent))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        {plannerPreviewError && (
          <p className="mb-4 rounded-xl bg-warning-soft px-3 py-2 text-sm font-medium text-warning-base">{plannerPreviewError}</p>
        )}
        <Suspense fallback={<FormSkeleton fields={allocationFields.length} />}>
          <ResourceForm
            schema={allocationSchema}
            fields={allocationFields}
            defaultValues={defaultAllocationValues}
            options={allocationOptions}
            isSaving={isSavingAllocation}
            submitLabel="Simpan alokasi"
            onSubmit={submitAllocation}
          />
        </Suspense>
        {allAccounts.length < 2 && (
          <p className="mt-3 text-sm text-danger-base">
            Tambahkan minimal dua rekening aktif agar alokasi dana bisa dilakukan.
          </p>
        )}
      </Modal>
    </>
  );
}
