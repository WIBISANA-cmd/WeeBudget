import { useEffect, useState } from 'react';
import { RefreshCw, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ErrorState from '../components/feedback/ErrorState';
import LoadingSkeleton from '../components/feedback/LoadingSkeleton';
import { apiGet, apiPut } from '../api/http';
import { formatCurrency, formatDate } from '../lib/formatters';
import { cn } from '../lib/utils';

const parseAmount = (value) => Number(String(value || '').replace(/\D/g, ''));
const parsePercentage = (value) => {
  const normalized = String(value ?? '').replace(/[^\d.]/g, '');
  if (!normalized) return 0;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
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
  const [isSavingCustomAllocations, setSavingCustomAllocations] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [error, setError] = useState(null);
  const [plannerInputError, setPlannerInputError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    setIsMobile(media.matches);
    const listener = (e) => setIsMobile(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const loadPlanner = async (amount = '') => {
    const normalizedAmount = parseAmount(amount);
    const hasManualAmount = String(amount).trim() !== '' && normalizedAmount > 0;

    if (!hasManualAmount) {
      setPlanner(null);
      setPlannerInputError('Masukkan nominal dasar terlebih dahulu agar planner dihitung sesuai angka yang kamu input.');
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setPlannerInputError(null);
    setSaveMessage(null);
    try {
      const response = await apiGet('/budget-planner', { base_amount: normalizedAmount });
      setPlanner(response.data);
      setCustomAllocations({});
    } catch (err) {
      setError(err.response?.data?.message || 'Budget planner belum bisa dimuat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(false);
  }, []);

  if (isLoading && !planner) return <LoadingSkeleton rows={6} />;
  if (error) return <ErrorState message={error} onRetry={() => loadPlanner()} />;

  const activePeriod = planner?.period;
  const usesActivePeriod = planner?.period_source === 'active_period';
  const customAllocationItems = (planner?.allocations || []).map((item) => {
    const percentInput = customAllocations[item.key] ?? '';
    const customPercent = parsePercentage(percentInput);
    const customAmount = Math.round(((planner?.base_amount || 0) * customPercent)) / 100;
    const hasCustomPercent = percentInput !== '';

    return {
      ...item,
      percentInput,
      customPercent,
      customAmount,
      appliedPercent: hasCustomPercent ? customPercent : item.percent,
      appliedAmount: hasCustomPercent ? customAmount : item.amount,
      hasCustomPercent,
    };
  });
  const totalCustomPercentage = customAllocationItems.reduce((sum, item) => sum + item.appliedPercent, 0);
  const totalCustomAllocation = customAllocationItems.reduce((sum, item) => sum + item.appliedAmount, 0);
  const percentageDifference = Math.round((100 - totalCustomPercentage) * 100) / 100;
  const isPercentageBalanced = Math.abs(percentageDifference) < 0.001;
  const customNeedsAmount = customAllocationItems.find((item) => item.key === 'needs')?.appliedAmount || 0;
  const customDailySafe = Math.floor(customNeedsAmount / Math.max(planner?.days_until_payday || 1, 1));

  const saveCustomAllocations = async () => {
    if (!isPercentageBalanced) {
      setSaveMessage({ type: 'error', text: 'Custom alokasi belum bisa disimpan karena total persentase harus tepat 100%.' });
      return;
    }

    setSavingCustomAllocations(true);
    setSaveMessage(null);
    try {
      await apiPut('/budget-planner/allocations', {
        base_amount: parseAmount(baseAmount),
        allocations: customAllocationItems.map((item) => ({
          key: item.key,
          percent: item.appliedPercent,
        })),
      });

      const refreshedPlanner = await apiGet('/budget-planner', { base_amount: parseAmount(baseAmount) });
      setPlanner(refreshedPlanner.data);
      setCustomAllocations({});
      setSaveMessage({ type: 'success', text: 'Custom alokasi berhasil disimpan dan sekarang menjadi rekomendasi aktif.' });
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err.response?.data?.message || 'Custom alokasi belum bisa disimpan.',
      });
    } finally {
      setSavingCustomAllocations(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-title">Budget Planner</h1>
        </div>
        <div className={cn(
          "flex gap-3",
          isMobile
            ? "sticky top-0 z-40 bg-bg-base/95 backdrop-blur py-3 border-b border-border-subtle -mx-4 px-4 items-center"
            : "items-end"
        )}>
          <div className="flex-1">
            <Input
              className="min-w-0 w-full"
              inputMode="numeric"
              label={isMobile ? undefined : "Saldo/gaji dasar"}
              placeholder={isMobile ? "Saldo/gaji dasar" : "masukkan nominal"}
              value={baseAmount}
              onChange={(event) => setBaseAmount(formatAmountInput(event.target.value, { allowZero: true }))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  loadPlanner(baseAmount);
                }
              }}
            />
          </div>
          <Button className="h-10 md:h-12 shrink-0" onClick={() => loadPlanner(baseAmount)} isLoading={isLoading}>
            <RefreshCw size={16} className={isMobile ? "mr-1" : "mr-2"} />
            Hitung
          </Button>
        </div>
      </header>

      {plannerInputError && !planner && (
        <Card className="border-primary-500/25 bg-primary-500/5">
          <CardContent className="py-5">
            <p className="text-sm font-medium text-primary-600">{plannerInputError}</p>
          </CardContent>
        </Card>
      )}

      {!planner ? null : (
        <>

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
            <p className="text-sm text-text-muted">Hari tersisa hingga gajian (terhitung mulai dari hari ini)</p>
            <p className="mt-3 text-3xl font-semibold text-primary-600">{planner?.days_until_payday}</p>
          </div>
          <div className="rounded-2xl bg-surface-100 p-4 shadow-sm shadow-card-soft">
            <p className="text-sm text-text-muted">Aman harian dari alokasi kebutuhan</p>
            <p className="mt-3 text-2xl font-semibold text-primary-600">{formatBudgetCurrency(customDailySafe)}</p>
            <p className="mt-2 text-xs text-text-muted">Rekomendasi awal: {formatBudgetCurrency(planner?.daily_safe_from_plan)}</p>
          </div>
        </CardContent>
      </Card>

      {isMobile ? (
        <div className="sticky top-[65px] z-35 bg-bg-base/95 backdrop-blur py-3 border-b border-border-subtle -mx-4 px-4 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">
            <span className={isPercentageBalanced ? 'text-success-base' : 'text-danger-base'}>
              {isPercentageBalanced ? 'Sudah pas 100%' : percentageDifference > 0 ? `Kurang ${percentageDifference}%` : `Lebih ${Math.abs(percentageDifference)}%`}
            </span>
            <span className="text-xs text-text-muted ml-1.5">({totalCustomPercentage}%)</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setCustomAllocations({})}>
              Reset
            </Button>
            <Button size="sm" onClick={saveCustomAllocations} isLoading={isSavingCustomAllocations} disabled={!isPercentageBalanced}>
              Simpan
            </Button>
          </div>
        </div>
      ) : (
        <Card className={isPercentageBalanced ? 'border-success-base' : 'border-danger-base'}>
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Custom alokasi dana</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setCustomAllocations({})}>
                Kosongkan input
              </Button>
              <Button onClick={saveCustomAllocations} isLoading={isSavingCustomAllocations} disabled={!isPercentageBalanced}>
                Simpan custom alokasi
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-surface-100 p-4 shadow-sm shadow-card-soft">
              <p className="text-sm text-text-muted">Total persentase custom</p>
              <p className={`mt-3 text-2xl font-semibold ${isPercentageBalanced ? 'text-text-title' : 'text-danger-base'}`}>{totalCustomPercentage}%</p>
            </div>
            <div className="rounded-2xl bg-surface-100 p-4 shadow-sm shadow-card-soft">
              <p className="text-sm text-text-muted">Total nominal hasil custom</p>
              <p className="mt-3 text-2xl font-semibold text-text-title">
                {formatBudgetCurrency(totalCustomAllocation)}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-100 p-4 shadow-sm shadow-card-soft">
              <p className="text-sm text-text-muted">Status persentase</p>
              <p className={`mt-3 text-lg font-semibold ${isPercentageBalanced ? 'text-primary-600' : 'text-danger-base'}`}>
                {isPercentageBalanced ? 'Sudah pas 100%' : percentageDifference > 0 ? `Kurang ${percentageDifference}%` : `Lebih ${Math.abs(percentageDifference)}%`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {saveMessage && (
        <div className={cn(
          "rounded-2xl px-4 py-3 text-sm font-medium",
          isMobile ? "" : "pt-0",
          saveMessage.type === 'success' ? 'bg-success-base/10 text-success-base' : 'bg-danger-base/10 text-danger-base'
        )}>
          {saveMessage.text}
        </div>
      )}

      {isMobile ? (
        <div className="space-y-3">
          {customAllocationItems.map((item, index) => (
            <div key={item.key} className="flex items-center gap-3 bg-surface-panel p-3.5 rounded-2xl border border-border-subtle shadow-sm shadow-card-soft">
              <span className="text-sm font-bold text-text-muted min-w-[20px]">{index + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-title truncate">{item.label}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Rekomendasi: <span className="font-medium text-text-body">{item.percent}%</span>
                </p>
                <p className="text-sm font-bold text-primary-600 mt-1">
                  {formatBudgetCurrency(item.appliedAmount)}
                </p>
              </div>
              <div className="w-24 shrink-0">
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="0.01"
                    value={item.percentInput}
                    placeholder={String(item.percent)}
                    onChange={(event) =>
                      setCustomAllocations((current) => ({
                        ...current,
                        [item.key]: event.target.value,
                      }))
                    }
                    className="w-full text-right pr-7 pl-3 h-10 text-sm font-medium rounded-xl border border-border-subtle bg-surface-panel focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-muted">%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {customAllocationItems.map((item) => (
            <Card key={item.key} className="h-full">
              <CardHeader>
                <CardTitle className="text-base">{item.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-2xl font-semibold text-text-title">{formatBudgetCurrency(item.appliedAmount)}</p>
                  <p className="mt-2 text-sm font-medium text-primary-600">
                    {item.hasCustomPercent ? `Custom saat ini ${item.customPercent}%` : `Masih memakai rekomendasi ${item.percent}%`}
                  </p>
                </div>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.01"
                  label="Persentase custom"
                  value={item.percentInput}
                  placeholder={String(item.percent)}
                  onChange={(event) =>
                    setCustomAllocations((current) => ({
                      ...current,
                      [item.key]: event.target.value,
                    }))
                  }
                />
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-300">
                  <div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.min(item.appliedPercent, 100)}%` }} />
                </div>
                <p className="text-sm leading-6 text-text-muted">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </>
      )}

      {!planner ? null : (
        <Card className="border-info-base">
          <CardContent>
            <p className="text-sm font-semibold text-info-base">Rekomendasi WeeB</p>
            <p className="mt-2 text-text-body">{planner?.recommendation}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
