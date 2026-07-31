import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Search, SlidersHorizontal, Wallet, X } from 'lucide-react';
import SelectBox from '../../components/ui/SelectBox';
import { needTypeOptions } from '../shared/crudConfigs';
import { buildTransactionParams, countActiveFilters, emptyFilters, periodOptions } from './transactionFilterParams';
import { formatCurrency } from '../../lib/formatters';
import { cn } from '../../lib/utils';

const dateInputClass = 'w-full rounded-xl border border-border-subtle bg-surface-panel px-4 py-3 text-sm text-text-title shadow-sm shadow-card-soft focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

export default function TransactionFilters({ resource, categories = [], accounts = [], type, perPage = 30 }) {
  const { setParams } = resource;
  const [filters, setFilters] = useState(emptyFilters);
  const [isOpen, setOpen] = useState(false);
  const isFirstRun = useRef(true);

  // Debounced so typing in search does not fire a request per keystroke.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return undefined;
    }

    const timer = setTimeout(() => setParams(buildTransactionParams(filters, { per_page: perPage })), 300);
    return () => clearTimeout(timer);
  }, [filters, perPage, setParams]);

  const categoryOptions = useMemo(() => [
    { value: '', label: 'Semua kategori' },
    ...categories
      .filter((category) => !type || category.type === type || category.type === 'both')
      .map((category) => ({ value: category.value, label: category.label })),
  ], [categories, type]);

  const accountFilterOptions = useMemo(() => [
    { value: '', label: 'Semua rekening' },
    ...accounts.map((account) => ({ value: account.value, label: account.label.split(' - ')[0] })),
  ], [accounts]);

  const activeCount = countActiveFilters(filters);
  const update = (patch) => setFilters((current) => ({ ...current, ...patch }));

  const selectedAccount = useMemo(
    () => accounts.find((account) => String(account.value) === String(filters.account_id)) || null,
    [accounts, filters.account_id],
  );
  const remainingBalance = selectedAccount
    ? Number(selectedAccount.balance || 0)
    : accounts.reduce((total, account) => total + Number(account.balance || 0), 0);

  return (
    <div className="rounded-[24px] border border-border-subtle bg-gradient-to-br from-surface-panel via-surface-panel to-surface-100/70 p-3 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] md:rounded-[28px] md:p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            value={filters.search}
            onChange={(event) => update({ search: event.target.value })}
            placeholder="Cari deskripsi atau catatan..."
            aria-label="Cari transaksi"
            className={cn(dateInputClass, 'pl-10', filters.search && 'pr-10')}
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => update({ search: '' })}
              aria-label="Hapus pencarian"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-danger-base"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={isOpen}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors md:flex-none',
              isOpen || activeCount > 0
                ? 'border-primary-500 bg-primary-500/10 text-primary-600'
                : 'border-border-subtle bg-surface-panel text-text-body hover:border-primary-400 hover:text-primary-600',
            )}
          >
            <SlidersHorizontal size={16} />
            Filter
            {activeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1.5 text-xs font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => setFilters(emptyFilters)}
              aria-label="Reset filter"
              title="Reset filter"
              className="flex items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface-panel px-4 py-3 text-sm font-semibold text-text-body transition-colors hover:border-danger-base hover:text-danger-base"
            >
              <RotateCcw size={16} />
              <span className="md:hidden">Reset</span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-100/70 px-3 py-2.5">
        <span className="flex min-w-0 items-center gap-2 text-sm text-text-muted">
          <Wallet size={16} className="shrink-0 text-primary-600" />
          <span className="truncate">
            Sisa saldo {selectedAccount ? selectedAccount.label.split(' - ')[0] : 'semua rekening'}
          </span>
        </span>
        <span className={cn('text-base font-semibold', remainingBalance < 0 ? 'text-danger-base' : 'text-text-title')}>
          {formatCurrency(remainingBalance)}
        </span>
      </div>

      {isOpen && (
        <div className="mt-3 grid gap-3 border-t border-border-subtle pt-3 md:grid-cols-2 xl:grid-cols-4">
          <SelectBox
            label="Kategori"
            value={filters.category_id}
            options={categoryOptions}
            onChange={(option) => update({ category_id: option.value })}
          />
          <SelectBox
            label="Rekening"
            value={filters.account_id}
            options={accountFilterOptions}
            onChange={(option) => update({ account_id: option.value })}
          />
          <SelectBox
            label="Periode"
            value={filters.period}
            options={periodOptions}
            onChange={(option) => update({ period: option.value, date_from: '', date_to: '' })}
          />
          {type !== 'income' && (
            <SelectBox
              label="Jenis kebutuhan"
              value={filters.need_type}
              options={[{ value: '', label: 'Semua jenis' }, ...needTypeOptions]}
              onChange={(option) => update({ need_type: option.value })}
            />
          )}

          {filters.period === 'custom' && (
            <>
              <div className="flex w-full flex-col gap-1.5">
                <label className="text-sm font-medium text-text-body" htmlFor="filter-date-from">Dari tanggal</label>
                <input
                  id="filter-date-from"
                  type="date"
                  value={filters.date_from}
                  max={filters.date_to || undefined}
                  onChange={(event) => update({ date_from: event.target.value })}
                  className={dateInputClass}
                />
              </div>
              <div className="flex w-full flex-col gap-1.5">
                <label className="text-sm font-medium text-text-body" htmlFor="filter-date-to">Sampai tanggal</label>
                <input
                  id="filter-date-to"
                  type="date"
                  value={filters.date_to}
                  min={filters.date_from || undefined}
                  onChange={(event) => update({ date_to: event.target.value })}
                  className={dateInputClass}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
