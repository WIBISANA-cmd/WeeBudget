import { z } from 'zod';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import ResourceForm from '../components/forms/ResourceForm';
import LoadingSkeleton from '../components/feedback/LoadingSkeleton';
import ErrorState from '../components/feedback/ErrorState';
import { apiGet, apiPut } from '../api/http';

const schema = z.object({
  name: z.string().min(2),
  monthly_income_estimate: z.coerce.number().min(0).optional().or(z.literal('')),
  payday_day: z.coerce.number().min(1).max(31).optional().or(z.literal('')),
  daily_safe_amount_target: z.coerce.number().min(0).optional().or(z.literal('')),
  account_mode: z.enum(['personal', 'couple']).optional(),
});

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const response = await apiGet('/profile');
        setProfile(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Profil belum bisa dimuat.');
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const submit = async (values) => {
    setSaving(true);
    setError(null);
    try {
      await apiPut('/profile', values);
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Profil belum bisa disimpan.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-text-title">Profil & Pengaturan</h1>
        <p className="mt-2 text-text-muted">Atur data dasar yang dipakai WeeB untuk menghitung kondisi finansial.</p>
      </header>
      {error && <ErrorState message={error} />}
      <Card>
        <CardHeader>
          <CardTitle>Financial profile</CardTitle>
          <CardDescription>Ubah gaji, tanggal gajian, dan target aman harian.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResourceForm
            schema={schema}
            isSaving={isSaving}
            submitLabel="Simpan pengaturan"
            defaultValues={{
              name: profile?.name || '',
              monthly_income_estimate: profile?.profile?.monthly_income_estimate || '',
              payday_day: profile?.profile?.payday_day || '',
              daily_safe_amount_target: profile?.profile?.daily_safe_amount_target || '',
              account_mode: profile?.profile?.account_mode || 'couple',
            }}
            fields={[
              { name: 'name', label: 'Nama panggilan' },
              { name: 'monthly_income_estimate', label: 'Penghasilan bulanan', type: 'number', valueAsNumber: true },
              { name: 'payday_day', label: 'Tanggal gajian', type: 'number', valueAsNumber: true },
              { name: 'daily_safe_amount_target', label: 'Target aman harian', type: 'number', valueAsNumber: true },
              { name: 'account_mode', label: 'Tipe penggunaan aplikasi', type: 'select', options: [{ label: 'Berdua', value: 'couple' }, { label: 'Pribadi', value: 'personal' }] },
            ]}
            onSubmit={submit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
