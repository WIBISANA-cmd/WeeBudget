import { useEffect, useState } from 'react';
import { RefreshCw, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ErrorState from '../components/feedback/ErrorState';
import LoadingSkeleton from '../components/feedback/LoadingSkeleton';
import { apiGet } from '../api/http';
import { formatCurrency, formatDate } from '../lib/formatters';

const parseAmount = (value) => Number(String(value || '').replace(/\D/g, ''));
const formatAmountInput = (value) => {
  const amount = parseAmount(value);
  return amount ? new Intl.NumberFormat('id-ID').format(amount) : '';
};

export default function BudgetPlannerPage() {
  const [baseAmount, setBaseAmount] = useState('');
  const [planner, setPlanner] = useState(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPlanner = async (amount = '') => {
    setLoading(true);
    setError(null);
    try {
      const numericAmount = parseAmount(amount);
      const response = await apiGet('/budget-planner', numericAmount ? { base_amount: numericAmount } : {});
      setPlanner(response.data);
      if (amount === '') {
        setBaseAmount(formatAmountInput(response.data.base_amount));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Budget planner belum bisa dimuat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => loadPlanner(''));
  }, []);

  if (isLoading && !planner) return <LoadingSkeleton rows={6} />;
  if (error) return <ErrorState message={error} onRetry={() => loadPlanner()} />;

  const activePeriod = planner?.period;
  const usesActivePeriod = planner?.period_source === 'active_period';

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-title">Budget Planner</h1>
          <p className="mt-2 max-w-2xl text-text-muted">
            Bagi saldo atau gaji ke pos utama: kebutuhan wajib, tabungan, tabungan berdua, dana darurat, dan keinginan.
          </p>
        </div>
        <div className="flex gap-3">
          <Input
            className="min-w-[220px]"
            inputMode="numeric"
            label="Saldo/gaji dasar"
            value={baseAmount}
            onChange={(event) => setBaseAmount(formatAmountInput(event.target.value))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                loadPlanner(baseAmount);
              }
            }}
          />
          <Button className="self-end" onClick={() => loadPlanner(baseAmount)} isLoading={isLoading}>
            <RefreshCw size={16} className="mr-2" />
            Hitung
          </Button>
        </div>
      </header>

      <Card className={usesActivePeriod ? 'border-primary-500/20 bg-primary-500/5' : 'border-warning-base/20 bg-warning-base/5'}>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-text-title">
              {usesActivePeriod ? `Periode aktif: ${activePeriod?.name}` : 'Belum ada periode aktif'}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              {usesActivePeriod
                ? `${formatDate(activePeriod?.start_date)} - ${formatDate(activePeriod?.end_date)}`
                : 'Budget Planner memakai fallback tanggal gajian profil. Aktifkan satu periode di menu Manajemen Periode agar hitungan mengikuti periode bulanan.'}
            </p>
          </div>
          <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-primary-600 shadow-sm shadow-slate-900/5">
            {usesActivePeriod ? 'Mengikuti Manajemen Periode' : 'Fallback profil'}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary-500/20 bg-gradient-to-br from-surface-100 to-primary-500/10">
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/5">
            <Wallet className="text-primary-600" />
            <p className="mt-3 text-sm text-text-muted">Dana dasar</p>
            <p className="text-2xl font-semibold text-text-title">{formatCurrency(planner?.base_amount)}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/5">
            <p className="text-sm text-text-muted">{usesActivePeriod ? 'Hari tersisa periode' : 'Hari sampai gajian'}</p>
            <p className="mt-3 text-3xl font-semibold text-primary-600">{planner?.days_until_payday}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/5">
            <p className="text-sm text-text-muted">Aman harian dari pos kebutuhan</p>
            <p className="mt-3 text-2xl font-semibold text-primary-600">{formatCurrency(planner?.daily_safe_from_plan)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {(planner?.allocations || []).map((item) => (
          <Card key={item.key} className="h-full">
            <CardHeader>
              <CardTitle className="text-base">{item.label}</CardTitle>
              <CardDescription>{item.percent}% dari dana dasar</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-text-title">{formatCurrency(item.amount)}</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-300">
                <div className="h-full rounded-full bg-primary-500" style={{ width: `${item.percent}%` }} />
              </div>
              <p className="mt-4 text-sm leading-6 text-text-muted">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-info-base/20 bg-info-base/5">
        <CardContent>
          <p className="text-sm font-semibold text-info-base">Rekomendasi WeeB</p>
          <p className="mt-2 text-text-body">{planner?.recommendation}</p>
        </CardContent>
      </Card>
    </div>
  );
}
