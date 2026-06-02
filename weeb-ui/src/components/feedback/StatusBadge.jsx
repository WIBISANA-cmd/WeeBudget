import { cn } from '../../lib/utils';

const tones = {
  active: 'bg-success-base text-white border-success-base',
  paid: 'bg-success-base text-white border-success-base',
  safe: 'bg-success-base text-white border-success-base',
  waiting: 'bg-warning-base text-white border-warning-base',
  warning: 'bg-warning-base text-white border-warning-base',
  exceeded: 'bg-danger-base text-white border-danger-base',
  expense: 'bg-danger-base text-white border-danger-base',
  income: 'bg-success-base text-white border-success-base',
  want: 'bg-warning-base text-white border-warning-base',
  need: 'bg-primary-500 text-white border-primary-500',
  saving: 'bg-success-base text-white border-success-base',
  debt: 'bg-danger-base text-white border-danger-base',
  cash: 'bg-success-base text-white border-success-base',
  bank: 'bg-primary-500 text-white border-primary-500',
  e_wallet: 'bg-warning-base text-white border-warning-base',
  digital_bank: 'bg-primary-500 text-white border-primary-500',
  daily_spending: 'bg-primary-500 text-white border-primary-500',
  salary: 'bg-success-base text-white border-success-base',
  savings: 'bg-success-base text-white border-success-base',
  couple_savings: 'bg-primary-500 text-white border-primary-500',
  emergency_fund: 'bg-danger-base text-white border-danger-base',
  bills: 'bg-warning-base text-white border-warning-base',
  wishlist: 'bg-primary-500 text-white border-primary-500',
  investment: 'bg-success-base text-white border-success-base',
};

export default function StatusBadge({ value, children }) {
  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize shadow-sm', tones[value] || 'bg-text-muted text-white border-text-muted')}>
      {children || value || '-'}
    </span>
  );
}
