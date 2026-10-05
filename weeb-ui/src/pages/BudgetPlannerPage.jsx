import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import PageHeader from '../components/layout/PageHeader';
import ErrorState from '../components/feedback/ErrorState';
import { Skeleton } from '../components/feedback/LoadingSkeleton';
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

// One grid for the allocation rows and their skeleton: name, bar, amount, percent input.
const ROW_GRID = 'grid grid-cols-[minmax(0,1fr)_88px] items-center gap-x-4 gap-y-1 py-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1fr)_96px]';
const STAT_CELLS = ['border-b md:border-b-0 md:border-r', 'border-r', ''];

function PlannerSkeleton() {
  return (
    <>
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-3">
          {STAT_CELLS.map((border, index) => (
            <div key={index} className={cn('border-border-subtle p-4', border, index === 0 && 'col-span-2 md:col-span-1')}>
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="mt-2 h-7 w-32" />
              <Skeleton className="mt-2 h-3 w-36" />
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
        </div>
        <div className="divide-y divide-border-subtle px-4">
          {['w-32', 'w-20', 'w-28', 'w-24'].map((width, index) => (
            <div key={index} className={ROW_GRID}>
              <div>
                <Skeleton className={cn('h-3.5', width)} />
                <Skeleton className="mt-2 h-3 w-28" />
              </div>
              <Skeleton className="hidden h-1.5 w-full rounded-full md:block" />
              <Skeleton className="col-start-1 row-start-2 h-4 w-28 md:col-start-auto md:row-start-auto md:ml-auto" />
              <Skeleton className="row-span-2 h-10 w-full rounded-xl md:row-span-1" />
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

export default function BudgetPlannerPage() {
  const [baseAmount, setBaseAmount] = useState('');
  const [planner, setPlanner] = useState(null);
  const [customAllocations, setCustomAllocations] = useState({});
  const [isLoading, setLoading] = useState(true);
  const [isSavingCustomAllocations, setSavingCustomAllocations] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [error, setError] = useState(null);
  const [plannerInputError, setPlannerInputError] = useState(null);

  const loadPlanner = async (amount = '') => {
    const normalizedAmount = parseAmount(amount);
    const hasManualAmount = String(amount).trim() !== '' && normalizedAmount > 0;

    if (!hasManualAmount) {
      setPlanner(null);
      setPlannerInputError('Masukkan nominal dasar dulu agar planner bisa dihitung.');
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
    let isMounted = true;

    queueMicrotask(async () => {
      try {
        // No base_amount: the server falls back to the saved one, so the planner arrives in one
        // round trip instead of asking for the saved amount and then asking again with it.
        const response = await apiGet('/budget-planner');

        if (!isMounted) {
          return;
        }

        const savedBaseAmount = Number(response.data?.saved_base_amount || 0);
        if (savedBaseAmount > 0) {
          setBaseAmount(formatAmountInput(savedBaseAmount, { allowZero: true }));
          setPlanner(response.data);
          setPlannerInputError(null);
          setError(null);
        }

        setLoading(false);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setLoading(false);
        setError(err.response?.data?.message || 'Budget planner belum bisa dimuat.');
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

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
  const totalCustomPercentage = Math.round(customAllocationItems.reduce((sum, item) => sum + item.appliedPercent, 0) * 100) / 100;
  const percentageDifference = Math.round((100 - totalCustomPercentage) * 100) / 100;
  const isPercentageBalanced = Math.abs(percentageDifference) < 0.001;
  const customNeedsAmount = customAllocationItems.find((item) => item.key === 'needs')?.appliedAmount || 0;
  const customDailySafe = Math.floor(customNeedsAmount / Math.max(planner?.days_until_payday || 1, 1));
  const balanceLabel = isPercentageBalanced
    ? 'Pas 100%'
    : percentageDifference > 0 ? `Kurang ${percentageDifference}%` : `Lebih ${Math.abs(percentageDifference)}%`;

  const handleResetPercentage = () => {
    const resetAllocations = {};
    (planner?.allocations || []).forEach((item) => {
      resetAllocations[item.key] = String(item.recommended_percent ?? item.percent ?? '');
    });
    setCustomAllocations(resetAllocations);
  };

  const saveCustomAllocations = async () => {
    if (!isPercentageBalanced) {
      setSaveMessage({ type: 'error', text: 'Total persentase harus tepat 100% sebelum disimpan.' });
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
      setSaveMessage({ type: 'success', text: 'Alokasi tersimpan dan sekarang menjadi rekomendasi aktif.' });
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err.response?.data?.message || 'Alokasi belum bisa disimpan.',
      });
    } finally {
      setSavingCustomAllocations(false);
    }
  };

  const stats = planner ? [
    { label: 'Dana dasar', value: formatBudgetCurrency(planner.base_amount), hint: usesActivePeriod ? activePeriod?.name : 'Mengikuti tanggal gajian profil' },
    { label: 'Hari ke gajian', value: `${Math.round(planner.days_until_payday)} hari`, hint: usesActivePeriod ? `sampai ${formatDate(activePeriod?.end_date)}` : 'terhitung dari hari ini' },
    { label: 'Aman harian', value: formatBudgetCurrency(customDailySafe), hint: `rekomendasi ${formatBudgetCurrency(planner.daily_safe_from_plan)}` },
  ] : [];

  return (
    <div className="space-y-3 md:space-y-4">
      <PageHeader title="Budget Planner" />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 md:max-w-sm">
            <Input
              inputMode="numeric"
              label="Saldo atau gaji dasar"
              placeholder="Contoh: 7.500.000"
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
          <Button className="h-11 shrink-0" onClick={() => loadPlanner(baseAmount)} isLoading={isLoading && Boolean(planner)}>
            {!(isLoading && planner) && <RefreshCw size={16} className="mr-2" />}
            Hitung
          </Button>
          {planner && !usesActivePeriod && (
            <p className="w-full text-sm text-warning-base">
              Belum ada periode aktif. Aktifkan satu periode di menu Periode agar hitungan mengikuti siklus gajian.
            </p>
          )}
          {plannerInputError && !planner && <p className="w-full text-sm text-text-muted">{plannerInputError}</p>}
        </CardContent>
      </Card>

      {error && <ErrorState message={error} onRetry={() => loadPlanner(baseAmount)} />}

      {isLoading && !planner && !error && <PlannerSkeleton />}

      {planner && (
        <>
          <Card>
            <dl className="grid grid-cols-2 md:grid-cols-3">
              {stats.map((stat, index) => (
                <div key={stat.label} className={cn('min-w-0 border-border-subtle p-4', STAT_CELLS[index], index === 0 && 'col-span-2 md:col-span-1')}>
                  <dt className="text-sm text-text-muted">{stat.label}</dt>
                  <dd className="mt-1 truncate text-2xl font-semibold tabular-nums text-text-title">{stat.value}</dd>
                  <p className="mt-0.5 truncate text-xs text-text-muted">{stat.hint}</p>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
              <div className="flex items-center gap-2">
                <h2 className="font-outfit text-base font-semibold text-text-title">Alokasi</h2>
                <span className={cn(
                  'rounded-md px-2 py-0.5 text-xs font-semibold',
                  isPercentageBalanced ? 'bg-success-soft text-success-base' : 'bg-danger-soft text-danger-base',
                )}>
                  {balanceLabel}
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={handleResetPercentage}>Reset</Button>
                <Button size="sm" onClick={saveCustomAllocations} isLoading={isSavingCustomAllocations} disabled={!isPercentageBalanced}>
                  Simpan
                </Button>
              </div>
            </div>

            {saveMessage && (
              <p className={cn(
                'border-b border-border-subtle px-4 py-2.5 text-sm font-medium',
                saveMessage.type === 'success' ? 'bg-success-soft text-success-base' : 'bg-danger-soft text-danger-base',
              )}>
                {saveMessage.text}
              </p>
            )}

            <ul className="divide-y divide-border-subtle px-4">
              {customAllocationItems.map((item) => (
                <li key={item.key} className={ROW_GRID}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-title">{item.label}</p>
                    <p className="text-xs text-text-muted">Rekomendasi {item.recommended_percent ?? item.percent}%</p>
                  </div>
                  <div className="hidden h-1.5 overflow-hidden rounded-full bg-surface-200 md:block">
                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.min(item.appliedPercent, 100)}%` }} />
                  </div>
                  <p className="col-start-1 row-start-2 text-sm font-semibold tabular-nums text-primary-600 md:col-start-auto md:row-start-auto md:text-right md:text-text-title">
                    {formatBudgetCurrency(item.appliedAmount)}
                  </p>
                  <div className="relative row-span-2 md:row-span-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="100"
                      step="0.01"
                      aria-label={`Persentase ${item.label}`}
                      value={item.percentInput}
                      placeholder={String(item.percent)}
                      onChange={(event) =>
                        setCustomAllocations((current) => ({
                          ...current,
                          [item.key]: event.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-border-subtle bg-surface-panel pl-3 pr-7 text-right text-sm font-medium tabular-nums text-text-title focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-border-strong"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-muted">%</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {planner.recommendation && (
            <p className="rounded-2xl bg-primary-soft px-4 py-3 text-sm leading-6 text-text-body">{planner.recommendation}</p>
          )}
        </>
      )}
    </div>
  );
}
