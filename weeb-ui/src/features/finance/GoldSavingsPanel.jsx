import { useCallback, useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp, Coins, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ErrorState from '../../components/feedback/ErrorState';
import LoadingSkeleton from '../../components/feedback/LoadingSkeleton';
import { apiGet } from '../../api/http';
import { compactCurrency, formatCurrency, formatDate } from '../../lib/formatters';
import { cn } from '../../lib/utils';

const GOLD_GRAMS_PRESETS = [0.01, 0.05, 0.1, 0.5, 1, 5, 10];
const HISTORY_LENGTH = 14;

function formatWeight(weight) {
  const normalized = Number(weight || 0);
  return Number.isInteger(normalized) ? `${normalized} gr` : `${normalized.toLocaleString('id-ID', { maximumFractionDigits: 2 })} gr`;
}

function formatGramValue(value) {
  return Number(value || 0).toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildChartTooltipStyle() {
  return {
    borderRadius: 14,
    border: '1px solid var(--color-border-subtle)',
    backgroundColor: 'var(--color-surface-panel)',
    color: 'var(--color-text-body)',
    boxShadow: 'var(--shadow-card)',
  };
}

function MetricCard({ icon: Icon, label, value, helper, tone }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4">
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-100', tone)}>
          <Icon size={22} />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-text-muted">{label}</p>
          <p className="mt-2 break-words text-2xl font-semibold text-text-title">{value}</p>
          <p className="mt-1 text-sm leading-5 text-text-muted">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GoldSavingsPanel() {
  const [currentPrice, setCurrentPrice] = useState(null);
  const [history, setHistory] = useState([]);
  const [marketSource, setMarketSource] = useState(null);
  const [gramsOwned, setGramsOwned] = useState('1');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadGoldData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const payload = await apiGet('/gold-savings/market', {
        history_length: HISTORY_LENGTH,
      });
      const latestRow = payload?.data?.current || null;
      const historyRows = Array.isArray(payload?.data?.history) ? payload.data.history : [];

      if (!latestRow || historyRows.length === 0) {
        throw new Error('Data harga emas hari ini atau historinya belum tersedia.');
      }

      setCurrentPrice(latestRow);
      setHistory(historyRows);
      setMarketSource(payload?.data || null);
    } catch (loadError) {
      setCurrentPrice(null);
      setHistory([]);
      setMarketSource(null);
      setError(loadError instanceof Error ? loadError.message : 'Terjadi kendala saat mengambil data emas.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(loadGoldData);
  }, [loadGoldData]);

  const latestUnitWeight = Number(currentPrice?.weight || 0);
  const sellPricePerGram = latestUnitWeight > 0 ? Number(currentPrice?.sellPrice || 0) / latestUnitWeight : 0;
  const buybackPricePerGram = latestUnitWeight > 0 ? Number(currentPrice?.buybackPrice || 0) / latestUnitWeight : 0;

  const sortedHistory = useMemo(() => (
    [...history].sort((left, right) => new Date(left.recordedDate) - new Date(right.recordedDate))
  ), [history]);

  const chartData = useMemo(() => (
    sortedHistory.map((item) => ({
      date: item.recordedDate,
      label: new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(new Date(item.recordedDate)),
      sellPerGram: Number(item.sellPrice || 0) / Math.max(Number(item.weight || 1), 0.0001),
      buybackPerGram: Number(item.buybackPrice || 0) / Math.max(Number(item.weight || 1), 0.0001),
    }))
  ), [sortedHistory]);

  const previousDay = sortedHistory.length > 1 ? sortedHistory[sortedHistory.length - 2] : null;
  const previousSellPerGram = previousDay ? Number(previousDay.sellPrice || 0) / Math.max(Number(previousDay.weight || 1), 0.0001) : 0;
  const dayChange = sellPricePerGram - previousSellPerGram;
  const dayChangePercent = previousSellPerGram > 0 ? (dayChange / previousSellPerGram) * 100 : 0;
  const gramsOwnedNumber = Math.max(Number(gramsOwned || 0), 0);

  const gramValuations = useMemo(() => (
    GOLD_GRAMS_PRESETS.map((weight) => ({
      weight,
      buyValue: buybackPricePerGram * weight,
      sellValue: sellPricePerGram * weight,
    }))
  ), [buybackPricePerGram, sellPricePerGram]);

  if (isLoading) {
    return <LoadingSkeleton rows={6} />;
  }

  if (error || !currentPrice) {
    return <ErrorState title="Tabungan emas belum siap" message={error || 'Data harga emas tidak tersedia.'} onRetry={loadGoldData} />;
  }

  return (
    <div className="space-y-6">
      <header className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-[rgba(251,191,36,0.35)] bg-[linear-gradient(135deg,rgba(251,191,36,0.16),rgba(255,255,255,0.02))]">
          <CardContent className="grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(251,191,36,0.35)] bg-[rgba(251,191,36,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                <Coins size={14} />
                EMAS {marketSource?.resource || 'pegadaian'}
              </div>
              <h2 className="mt-4 text-2xl font-bold text-text-title md:text-3xl">Harga tabungan emas hari ini</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                Harga live per {formatWeight(currentPrice.weight)} dari provider {marketSource?.provider || 'emas'} yang diproksikan lewat server aplikasi, tercatat pada {formatDate(currentPrice.recordedDate)}.
              </p>
              <p className="mt-5 text-4xl font-semibold text-text-title md:text-5xl">{formatCurrency(sellPricePerGram)}</p>
              <p className="mt-2 text-sm text-text-muted">Estimasi harga beli per 1 gram.</p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-surface-panel/80 p-4 shadow-sm shadow-card-soft">
              <p className="text-sm text-text-muted">Perubahan harian</p>
              <div className={cn('mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold', dayChange >= 0 ? 'bg-success-base/10 text-success-base' : 'bg-danger-base/10 text-danger-base')}>
                {dayChange >= 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                {formatCurrency(Math.abs(dayChange))} ({Math.abs(dayChangePercent).toFixed(2)}%)
              </div>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                Dibanding harga jual per gram pada {previousDay ? formatDate(previousDay.recordedDate) : 'hari sebelumnya'}.
              </p>
              <Button className="mt-4 w-full" variant="secondary" onClick={loadGoldData}>Perbarui harga</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Simulasi Tabungan Emas</CardTitle>
            <CardDescription>Masukkan total gram yang dimiliki untuk melihat estimasi nilainya saat ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Gram emas yang dimiliki"
              type="number"
              min="0"
              step="0.01"
              value={gramsOwned}
              onChange={(event) => setGramsOwned(event.target.value)}
              helperText={`1 gram = ${formatCurrency(sellPricePerGram)} harga beli hari ini.`}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-surface-100 p-4">
                <p className="text-sm text-text-muted">Estimasi beli</p>
                <p className="mt-2 text-2xl font-semibold text-text-title">{formatCurrency(gramsOwnedNumber * sellPricePerGram)}</p>
                <p className="mt-2 text-xs text-text-muted">{formatGramValue(gramsOwnedNumber)} gr x harga beli</p>
              </div>
              <div className="rounded-2xl bg-surface-100 p-4">
                <p className="text-sm text-text-muted">Estimasi buyback</p>
                <p className="mt-2 text-2xl font-semibold text-text-title">{formatCurrency(gramsOwnedNumber * buybackPricePerGram)}</p>
                <p className="mt-2 text-xs text-text-muted">{formatGramValue(gramsOwnedNumber)} gr x harga jual kembali</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={TrendingUp}
          label="Harga beli per gram"
          value={formatCurrency(sellPricePerGram)}
          helper={`Turunan dari ${formatWeight(currentPrice.weight)} = ${formatCurrency(currentPrice.sellPrice)}.`}
          tone="text-warning-base"
        />
        <MetricCard
          icon={Coins}
          label="Harga buyback per gram"
          value={formatCurrency(buybackPricePerGram)}
          helper="Estimasi nilai jual kembali per 1 gram."
          tone="text-primary-600"
        />
        <MetricCard
          icon={ArrowUp}
          label="Spread per gram"
          value={formatCurrency(Math.max(sellPricePerGram - buybackPricePerGram, 0))}
          helper="Selisih harga beli dan harga buyback saat ini."
          tone="text-danger-base"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Referensi Gramasi</CardTitle>
            <CardDescription>Perkiraan nilai berdasarkan harga Pegadaian tanggal {formatDate(currentPrice.recordedDate)}.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {gramValuations.map((item) => (
              <div key={item.weight} className="rounded-2xl border border-border-subtle bg-surface-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lg font-semibold text-text-title">{formatWeight(item.weight)}</p>
                  <span className="rounded-full bg-primary-500/10 px-2.5 py-1 text-xs font-semibold text-primary-600">Live</span>
                </div>
                <div className="mt-4 grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-text-muted">Harga beli</span>
                    <span className="font-semibold text-text-title">{formatCurrency(item.sellValue)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-text-muted">Buyback</span>
                    <span className="font-semibold text-text-title">{formatCurrency(item.buyValue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Harga 14 Hari</CardTitle>
            <CardDescription>Harga jual dan buyback per gram, diurutkan dari data historis terbaru provider emas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goldSellTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="goldBuybackTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#08A0FF" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#08A0FF" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--color-text-muted)" tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-text-muted)" tickLine={false} axisLine={false} tickFormatter={compactCurrency} width={52} />
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(value), name === 'sellPerGram' ? 'Harga beli' : 'Buyback']}
                    labelFormatter={(_, payload) => formatDate(payload?.[0]?.payload?.date)}
                    contentStyle={buildChartTooltipStyle()}
                  />
                  <Area type="monotone" dataKey="sellPerGram" stroke="#F59E0B" fill="url(#goldSellTrend)" strokeWidth={3} name="Harga beli" />
                  <Area type="monotone" dataKey="buybackPerGram" stroke="#08A0FF" fill="url(#goldBuybackTrend)" strokeWidth={3} name="Buyback" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-surface-100 p-4">
                <p className="text-sm text-text-muted">Data terbaru</p>
                <p className="mt-2 font-semibold text-text-title">{formatDate(currentPrice.recordedDate)}</p>
              </div>
              <div className="rounded-2xl bg-surface-100 p-4">
                <p className="text-sm text-text-muted">Sumber</p>
                <p className="mt-2 font-semibold text-text-title">{currentPrice.displayName || 'Pegadaian'}{currentPrice.materialType ? ` · ${currentPrice.materialType}` : ''}</p>
              </div>
              <div className="rounded-2xl bg-surface-100 p-4">
                <p className="text-sm text-text-muted">Satuan dasar API</p>
                <p className="mt-2 font-semibold text-text-title">{formatWeight(currentPrice.weight)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
