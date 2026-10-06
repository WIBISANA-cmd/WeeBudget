import { AlertCircle, ArrowDownLeft, ArrowUpRight, ChevronDown, Trash2 } from 'lucide-react';
import Input from '../ui/Input';
import SelectBox from '../ui/SelectBox';
import Segmented from '../ui/Segmented';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import { getDraftIssues } from './draftIssues';

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
];

const NEED_TYPE_OPTIONS = [
  { value: 'need', label: 'Kebutuhan' },
  { value: 'want', label: 'Keinginan' },
  { value: 'saving', label: 'Tabungan' },
  { value: 'debt', label: 'Cicilan' },
];

// Account options are labelled "Nama - Rp saldo"; the summary only has room for the name.
const accountName = (option) => String(option?.label || '').split(' - ')[0];

export default function DraftCard({ draft, index, isOpen, onToggle, onChange, onDelete, categories, accounts }) {
  const isIncome = draft.transaction_type === 'income';
  const categoryOptions = categories.filter((category) => category.type === draft.transaction_type || category.type === 'both');
  const category = categories.find((option) => String(option.value) === String(draft.category_id));
  const account = accounts.find((option) => String(option.value) === String(draft.account_id));
  const { blocking, advisory } = getDraftIssues(draft);
  const issues = [...blocking, ...advisory];
  const TypeIcon = isIncome ? ArrowDownLeft : ArrowUpRight;
  const panelId = `${draft.id}-fields`;

  const handleAmountChange = (event) => {
    const digits = event.target.value.replace(/\D/g, '');
    onChange('amount', digits ? Number(digits) : 0);
  };

  return (
    <article
      className={cn(
        'rounded-2xl border bg-surface-panel transition-colors duration-200',
        blocking.length > 0 ? 'border-danger-line' : advisory.length > 0 ? 'border-warning-line' : 'border-border-subtle',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="row-press flex w-full items-center gap-3 rounded-2xl p-3.5 text-left"
      >
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            isIncome ? 'bg-success-soft text-success-base' : 'bg-danger-soft text-danger-base',
          )}
        >
          <TypeIcon size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-text-title">
            {draft.description || `Transaksi ${index + 1}`}
          </span>
          <span className="mt-0.5 block truncate text-xs text-text-muted">
            {[category?.label || 'Tanpa kategori', accountName(account) || 'Tanpa rekening', formatDate(draft.transaction_date)].join(' · ')}
          </span>
        </span>
        <span className={cn('shrink-0 font-outfit text-sm font-semibold', isIncome ? 'text-success-base' : 'text-danger-base')}>
          {isIncome ? '+' : '-'}{formatCurrency(draft.amount)}
        </span>
        <ChevronDown size={18} className={cn('shrink-0 text-text-muted transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {issues.length > 0 && (
        <p
          className={cn(
            'mx-3.5 mb-3.5 flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium',
            blocking.length > 0 ? 'bg-danger-soft text-danger-base' : 'bg-warning-soft text-warning-base',
          )}
        >
          <AlertCircle size={14} className="mt-px shrink-0" />
          <span>{issues.join(' · ')}</span>
        </p>
      )}

      <div id={panelId} className="collapse-panel" data-open={isOpen} inert={!isOpen}>
        <div>
          <div className="space-y-3 border-t border-border-subtle p-3.5">
            <div className="flex items-center justify-between gap-3">
              <Segmented
                label="Jenis transaksi"
                options={TYPE_OPTIONS}
                value={draft.transaction_type}
                onChange={(value) => onChange('transaction_type', value)}
              />
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-text-muted transition-colors duration-150 hover:bg-danger-soft hover:text-danger-base"
              >
                <Trash2 size={15} />
                Hapus
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${draft.id}-amount`} className="text-sm font-medium text-text-body">Nominal</label>
              <div
                className={cn(
                  'flex h-14 items-center gap-2 rounded-xl border bg-surface-panel px-3.5 transition-colors',
                  'focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-border-strong',
                  Number(draft.amount) > 0 ? 'border-border-subtle' : 'border-danger-base',
                )}
              >
                <span className="text-sm font-semibold text-text-muted">Rp</span>
                <input
                  id={`${draft.id}-amount`}
                  type="text"
                  inputMode="numeric"
                  value={Number(draft.amount) > 0 ? new Intl.NumberFormat('id-ID').format(draft.amount) : ''}
                  onChange={handleAmountChange}
                  placeholder="0"
                  className="w-full min-w-0 bg-transparent font-outfit text-xl font-semibold text-text-title placeholder:text-text-muted focus:outline-none"
                />
              </div>
            </div>

            <Input
              label="Keterangan"
              value={draft.description}
              maxLength={160}
              placeholder="Contoh: Kopi susu"
              onChange={(event) => onChange('description', event.target.value)}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <SelectBox
                label={isIncome ? 'Rekening penerima' : 'Rekening sumber'}
                value={draft.account_id}
                options={accounts}
                placeholder="Pilih rekening"
                error={draft.account_id ? undefined : 'Wajib dipilih'}
                onChange={(option) => onChange('account_id', option.value)}
              />
              <SelectBox
                label="Kategori"
                value={draft.category_id}
                options={categoryOptions}
                placeholder="Pilih kategori"
                onChange={(option) => onChange('category_id', option.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="date"
                label="Tanggal"
                value={draft.transaction_date}
                onChange={(event) => onChange('transaction_date', event.target.value)}
              />
              {!isIncome && (
                <SelectBox
                  label="Klasifikasi"
                  value={draft.need_type || 'need'}
                  options={NEED_TYPE_OPTIONS}
                  onChange={(option) => onChange('need_type', option.value)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
