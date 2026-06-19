import { cn } from '../../lib/utils';

const tones = {
  active: 'bg-success-base text-white border-success-base dark:text-slate-950',
  paid: 'bg-success-base text-white border-success-base dark:text-slate-950',
  safe: 'bg-success-base text-white border-success-base dark:text-slate-950',
  waiting: 'bg-warning-base text-white border-warning-base dark:text-slate-950',
  warning: 'bg-warning-base text-white border-warning-base dark:text-slate-950',
  exceeded: 'bg-danger-base text-white border-danger-base dark:text-slate-950',
  expense: 'bg-danger-base text-white border-danger-base dark:text-slate-950',
  income: 'bg-success-base text-white border-success-base dark:text-slate-950',
  want: 'bg-warning-base text-white border-warning-base dark:text-slate-950',
  need: 'bg-primary-500 text-white border-primary-500 dark:text-slate-950',
  saving: 'bg-success-base text-white border-success-base dark:text-slate-950',
  debt: 'bg-danger-base text-white border-danger-base dark:text-slate-950',
  cash: 'bg-success-base text-white border-success-base dark:text-slate-950',
  bank: 'bg-primary-500 text-white border-primary-500 dark:text-slate-950',
  e_wallet: 'bg-warning-base text-white border-warning-base dark:text-slate-950',
  digital_bank: 'bg-primary-500 text-white border-primary-500 dark:text-slate-950',
  daily_spending: 'bg-primary-500 text-white border-primary-500 dark:text-slate-950',
  salary: 'bg-success-base text-white border-success-base dark:text-slate-950',
  savings: 'bg-success-base text-white border-success-base dark:text-slate-950',
  couple_savings: 'bg-primary-500 text-white border-primary-500 dark:text-slate-950',
  emergency_fund: 'bg-danger-base text-white border-danger-base dark:text-slate-950',
  bills: 'bg-warning-base text-white border-warning-base dark:text-slate-950',
  wishlist: 'bg-primary-500 text-white border-primary-500 dark:text-slate-950',
  investment: 'bg-success-base text-white border-success-base dark:text-slate-950',
  account_allocation: 'bg-primary-500 text-white border-primary-500 dark:text-slate-950',
  manual: 'bg-success-base text-white border-success-base dark:text-slate-950',
};

export default function StatusBadge({ value, children }) {
  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize shadow-sm', tones[value] || 'bg-text-muted text-white border-text-muted')}>
      {children || value || '-'}
    </span>
  );
}
