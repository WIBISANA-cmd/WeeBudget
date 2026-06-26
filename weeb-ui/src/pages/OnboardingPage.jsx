import { z } from 'zod';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import ResourceForm from '../components/forms/ResourceForm';
import ErrorState from '../components/feedback/ErrorState';
import { apiPost } from '../api/http';

const schema = z.object({
  account_mode: z.enum(['personal', 'couple']),
});

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isSaving, setSaving] = useState(false);

  const submit = async (values) => {
    setSaving(true);
    setError(null);
    const fullPayload = {
      name: 'Teman WeeB',
      monthly_income_estimate: 3200000,
      payday_day: 25,
      daily_safe_amount_target: 65000,
      financial_priority: 'survive_until_payday',
      saving_goal_name: 'Tabungan Pertama',
      saving_goal_target: 1000000,
      emergency_fund_target: 1000000,
      ...values,
    };
    try {
      await apiPost('/onboarding', fullPayload);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Onboarding belum bisa disimpan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-text-title">Setup Awal WeeB</h1>
        <p className="mt-2 text-text-muted">Pilih tipe penggunaan untuk memulai pengalaman finansial Anda.</p>
      </header>
      {error && <ErrorState message={error} />}
      <Card>
        <CardHeader>
          <CardTitle>Tipe Penggunaan</CardTitle>
          <CardDescription>Kamu bisa memilih apakah WeeB dipakai sendiri (pribadi) atau bersama pasangan.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResourceForm
            schema={schema}
            isSaving={isSaving}
            submitLabel="Simpan dan Masuk Dashboard"
            defaultValues={{
              account_mode: 'personal',
            }}
            fields={[
              {
                name: 'account_mode',
                label: 'Tipe penggunaan',
                type: 'select',
                options: [
                  { value: 'personal', label: 'Pribadi (Dipakai sendiri)' },
                  { value: 'couple', label: 'Berdua / Berpasangan' },
                ],
              },
            ]}
            onSubmit={submit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
