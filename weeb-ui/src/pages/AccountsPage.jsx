import { useMemo, useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { z } from 'zod';
import CrudResourcePage from '../features/shared/CrudResourcePage';
import { configs } from '../features/shared/crudConfigs';
import { useAccountOptions } from '../hooks/useAccountOptions';
import { resourcesApi } from '../api/resources';
import Button from '../components/ui/Button';
import Modal from '../components/forms/Modal';
import ResourceForm from '../components/forms/ResourceForm';

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
  const accountOptions = useAccountOptions();
  const activeAccounts = useMemo(() => accountOptions.accounts || [], [accountOptions.accounts]);
  const allocationOptions = useMemo(() => ({
    accounts: activeAccounts,
  }), [activeAccounts]);

  const defaultAllocationValues = useMemo(() => ({
    source_account_id: activeAccounts[0]?.value || '',
    destination_account_id: activeAccounts[1]?.value || '',
    amount: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    notes: '',
  }), [activeAccounts]);

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
      <div className="flex justify-end">
        <Button
          variant="secondary"
          onClick={() => setAllocationOpen(true)}
          disabled={activeAccounts.length < 2}
        >
          <ArrowRightLeft size={18} className="mr-2" />
          Alokasi Dana
        </Button>
      </div>

      <CrudResourcePage key={pageVersion} config={configs.accounts} />

      <Modal
        open={isAllocationOpen}
        onClose={() => setAllocationOpen(false)}
        title="Alokasi Dana"
        description="Pindahkan nominal dari satu rekening ke rekening lain tanpa mengubah saldo secara manual."
      >
        <ResourceForm
          schema={allocationSchema}
          fields={allocationFields}
          defaultValues={defaultAllocationValues}
          options={allocationOptions}
          isSaving={isSavingAllocation}
          submitLabel="Simpan alokasi"
          onSubmit={submitAllocation}
        />
        {activeAccounts.length < 2 && (
          <p className="mt-3 text-sm text-danger-base">
            Tambahkan minimal dua rekening aktif agar alokasi dana bisa dilakukan.
          </p>
        )}
      </Modal>
    </div>
  );
}
