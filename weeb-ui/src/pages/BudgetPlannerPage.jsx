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
const formatAmountInput = (value, { allowZero = false } = {}) => {
  const rawValue = String(value ?? '').replace(/\D/g, '');

  if (rawValue === '') {
    return '';
  }

  const amount = Number(rawValue);

  if (amount === 0) {
    return allowZero ? '0' : '';
  }

  return new Intl.NumberFormat('id-ID').format(amount);
};
const formatBudgetCurrency = (value) => formatCurrency(value).replace(/^Rp/, 'Rp ');

export default function BudgetPlannerPage() {
  const [baseAmount, setBaseAmount] = useState('');
  const [planner, setPlanner] = useState(null);
  const [customAllocations, setCustomAllocations] = useState({});
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPlanner = async (amount = '') => {
    setLoading(true);
    setError(null);
    try {
      const numericAmount = parseAmount(amount);
      const hasManualAmount = String(amount).trim() !== '';
      const response = await apiGet('/budget-planner', hasManualAmount ? { base_amount: numericAmount } : {});
      setPlanner(response.data);
      setCustomAllocations({});
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
  const customAllocationItems = (planner?.allocations || []).map((item) => {
    const amountInput = customAllocations[item.key] ?? '';
    const customAmount = parseAmount(amountInput);
    const actualPercent = planner?.base_amount ? Math.round((customAmount / planner.base_amount) * 100) : 0;
    const hasCustomAmount = amountInput !== '';

    return {
      ...item,
      amountInput,
      customAmount,
      actualPercent,
      hasCustomAmount,
    };
  });
  const totalCustomAllocation = customAllocationItems.reduce((sum, item) => sum + item.customAmount, 0);
  const remainingCustomAmount = Math.max((planner?.base_amount || 0) - totalCustomAllocation, 0);
  const exceededCustomAmount = Math.max(totalCustomAllocation - (planner?.base_amount || 0), 0);
  const customNeedsAmount = customAllocationItems.find((item) => item.key === 'needs')?.customAmount || 0;
  const customDailySafe = Math.floor(customNeedsAmount / Math.max(planner?.days_until_payday || 1, 1));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-title">Budget Planner</h1>
        </div>
        <div className="flex gap-3">
          <Input
            className="min-w-[220px]"
            inputMode="numeric"
            label="Saldo/gaji dasar"
            placeholder="masukkan nominal"
            value={baseAmount}
            onChange={(event) => setBaseAmount(formatAmountInput(event.target.value, { allowZero: true }))}
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

      <Card className={usesActivePeriod ? 'border-primary-500' : 'border-warning-base'}>
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
          <div className="rounded-xl bg-surface-100 px-4 py-3 text-sm font-semibold text-primary-600 shadow-sm shadow-card-soft">
            {usesActivePeriod ? 'Mengikuti Manajemen Periode' : 'Fallback profil'}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary-500">
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-surface-100 p-4 shadow-sm shadow-card-soft">
            <Wallet className="text-primary-600" />
            <p className="mt-3 text-sm text-text-muted">Dana dasar</p>
            <p className="text-2xl font-semibold text-text-title">{formatBudgetCurrency(planner?.base_amount)}</p>
          </div>
          <div className="rounded-2xl bg-surface-100 p-4 shadow-sm shadow-card-soft">
            <p className="text-sm text-text-muted">{usesActivePeriod ? 'Hari tersisa periode' : 'Hari sampai gajian'}</p>
            <p className="mt-3 text-3xl font-semibold text-primary-600">{planner?.days_until_payday}</p>
          </div>
          <div className="rounded-2xl bg-surface-100 p-4 shadow-sm shadow-card-soft">
            <p className="text-sm text-text-muted">Aman harian dari alokasi kebutuhan</p>
            <p className="mt-3 text-2xl font-semibold text-primary-600">{formatBudgetCurrency(customDailySafe)}</p>
            <p className="mt-2 text-xs text-text-muted">Rekomendasi awal: {formatBudgetCurrency(planner?.daily_safe_from_plan)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className={exceededCustomAmount > 0 ? 'border-danger-base' : 'border-success-base'}>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Custom alokasi dana</CardTitle>
            <CardDescription>Ubah tiap pos dalam nominal. Rekomendasi persen tetap dipakai sebagai titik awal.</CardDescription>
          </div>
          <Button variant="secondary" onClick={() => setCustomAllocations({})}>
            Kosongkan input
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-surface-100 p-4 shadow-sm shadow-card-soft">
            <p className="text-sm text-text-muted">Total alokasi custom</p>
            <p className="mt-3 text-2xl font-semibold text-text-title">{formatBudgetCurrency(totalCustomAllocation)}</p>
          </div>
          <div className="rounded-2xl bg-surface-100 p-4 shadow-sm shadow-card-soft">
            <p className="text-sm text-text-muted">{exceededCustomAmount > 0 ? 'Melebihi dana dasar' : 'Sisa belum dialokasikan'}</p>
            <p className={`mt-3 text-2xl font-semibold ${exceededCustomAmount > 0 ? 'text-danger-base' : 'text-success-base'}`}>
              {formatBudgetCurrency(exceededCustomAmount > 0 ? exceededCustomAmount : remainingCustomAmount)}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-100 p-4 shadow-sm shadow-card-soft">
            <p className="text-sm text-text-muted">Status alokasi</p>
            <p className={`mt-3 text-lg font-semibold ${exceededCustomAmount > 0 ? 'text-danger-base' : 'text-primary-600'}`}>
              {exceededCustomAmount > 0 ? 'Perlu dikurangi' : remainingCustomAmount > 0 ? 'Masih ada sisa dana' : 'Sudah pas'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {customAllocationItems.map((item) => (
          <Card key={item.key} className="h-full">
            <CardHeader>
              <CardTitle className="text-base">{item.label}</CardTitle>
              <CardDescription>Rekomendasi {item.percent}% dari dana dasar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-2xl font-semibold text-text-title">{formatBudgetCurrency(item.amount)}</p>
                <p className="mt-1 text-sm text-text-muted">Nominal rekomendasi hasil perhitungan</p>
                <p className="mt-2 text-sm font-medium text-primary-600">
                  {item.hasCustomAmount ? `Custom saat ini ${formatBudgetCurrency(item.customAmount)} (${item.actualPercent}%)` : 'Custom belum diisi'}
                </p>
              </div>
              <Input
                inputMode="numeric"
                label="Nominal custom"
                value={item.amountInput}
                placeholder={formatBudgetCurrency(item.amount)}
                onChange={(event) =>
                  setCustomAllocations((current) => ({
                    ...current,
                    [item.key]: formatAmountInput(event.target.value, { allowZero: true }),
                  }))
                }
                helperText="Isi jika ingin override nominal rekomendasi."
              />
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-300">
                <div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.min(item.hasCustomAmount ? item.actualPercent : item.percent, 100)}%` }} />
              </div>
              <p className="text-sm leading-6 text-text-muted">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-info-base">
        <CardContent>
          <p className="text-sm font-semibold text-info-base">Rekomendasi WeeB</p>
          <p className="mt-2 text-text-body">{planner?.recommendation}</p>
        </CardContent>
      </Card>
    </div>
  );
}
