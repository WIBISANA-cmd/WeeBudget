import { z } from 'zod';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import ResourceForm from '../components/forms/ResourceForm';
import ErrorState from '../components/feedback/ErrorState';
import { apiPost } from '../api/http';

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  monthly_income_estimate: z.coerce.number().min(0),
  payday_day: z.coerce.number().min(1).max(31),
  daily_safe_amount_target: z.coerce.number().min(0).optional().or(z.literal('')),
  account_mode: z.enum(['personal', 'couple']),
  financial_priority: z.enum(['survive_until_payday', 'reduce_spending', 'build_emergency_fund', 'pay_debt', 'save_for_goal']),
  saving_goal_name: z.string().optional(),
  saving_goal_target: z.coerce.number().positive().optional().or(z.literal('')),
  emergency_fund_target: z.coerce.number().positive().optional().or(z.literal('')),
});

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isSaving, setSaving] = useState(false);

  const submit = async (values) => {
    setSaving(true);
    setError(null);
    try {
      await apiPost('/onboarding', values);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Onboarding belum bisa disimpan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-text-title">Setup awal WeeB</h1>
        <p className="mt-2 text-text-muted">Isi beberapa data dasar supaya WeeB bisa menghitung aman sampai gajian dengan lebih masuk akal.</p>
      </header>
      {error && <ErrorState message={error} />}
      <Card>
        <CardHeader>
              <CardTitle>Profil finansial awal</CardTitle>
          <CardDescription>Data ini bisa diubah lagi kapan saja di pengaturan. Kamu juga bisa memilih apakah WeeB dipakai sendiri atau berpasangan.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResourceForm
            schema={schema}
            isSaving={isSaving}
            submitLabel="Simpan dan masuk dashboard"
            defaultValues={{
              name: 'Teman WeeB',
              monthly_income_estimate: 3200000,
              payday_day: 25,
              daily_safe_amount_target: 65000,
              account_mode: 'couple',
              financial_priority: 'survive_until_payday',
              saving_goal_name: 'Service motor',
              saving_goal_target: 750000,
              emergency_fund_target: 1000000,
            }}
            fields={[
              { name: 'account_mode', label: 'Mode penggunaan', type: 'select', options: [
                { value: 'couple', label: 'Berdua / Berpasangan' },
                { value: 'personal', label: 'Pribadi' },
              ] },
              { name: 'name', label: 'Nama panggilan' },
              { name: 'monthly_income_estimate', label: 'Penghasilan bulanan', type: 'number', valueAsNumber: true },
              { name: 'payday_day', label: 'Tanggal gajian', type: 'number', valueAsNumber: true },
              { name: 'daily_safe_amount_target', label: 'Target uang aman harian', type: 'number', valueAsNumber: true },
              { name: 'financial_priority', label: 'Prioritas bulan ini', type: 'select', options: [
                { value: 'survive_until_payday', label: 'Bertahan sampai gajian' },
                { value: 'reduce_spending', label: 'Kurangi pengeluaran' },
                { value: 'build_emergency_fund', label: 'Bangun dana darurat' },
                { value: 'pay_debt', label: 'Bayar utang/cicilan' },
                { value: 'save_for_goal', label: 'Nabung target tertentu' },
              ] },
              { name: 'saving_goal_name', label: 'Target tabungan pertama' },
              { name: 'saving_goal_target', label: 'Nominal target tabungan', type: 'number', valueAsNumber: true },
              { name: 'emergency_fund_target', label: 'Target dana darurat awal', type: 'number', valueAsNumber: true },
            ]}
            onSubmit={submit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
