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
  const accountOptions = useAccountOptions({ includeInactive: true });
  const allAccounts = useMemo(() => accountOptions.accounts || [], [accountOptions.accounts]);
  const allocationOptions = useMemo(() => ({
    accounts: allAccounts,
  }), [allAccounts]);

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

    queueMicrotask(async () => {
      try {
        const response = await apiGet('/budget-planner');
        setPlannerPreview(response.data || null);
        setPlannerPreviewError(null);
      } catch (error) {
        setPlannerPreview(null);
        setPlannerPreviewError(error.response?.data?.message || 'Preview budget planner belum bisa dimuat.');
      }
    });
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
    <div className="space-y-4">
      <CrudResourcePage
        key={pageVersion}
        config={{ ...configs.accounts, noCard: true }}
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
          <Card className="mb-4 border-primary-500 bg-primary-500/5">
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-text-muted">Acuan nominal dari Budget Planner</p>
                <p className="mt-1 text-lg font-semibold text-text-title">
                  Dana dasar {formatCurrency(plannerPreview.base_amount || 0)}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Gunakan nominal ini sebagai referensi sebelum submit alokasi dana antar rekening.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {(plannerPreview.allocations || []).map((item) => (
                  <div key={item.key} className="rounded-2xl bg-surface-panel p-4 shadow-sm shadow-card-soft">
                    <p className="text-sm text-text-muted">{item.label}</p>
                    <p className="mt-1 text-lg font-semibold text-primary-600">{formatCurrency(item.amount)}</p>
                    <p className="mt-1 text-xs text-text-muted">{item.percent}% dari dana dasar</p>
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
            onSubmit={submitAllocation}
          />
        </Suspense>
        {allAccounts.length < 2 && (
          <p className="mt-3 text-sm text-danger-base">
            Tambahkan minimal dua rekening aktif agar alokasi dana bisa dilakukan.
          </p>
        )}
      </Modal>
    </div>
  );
}
