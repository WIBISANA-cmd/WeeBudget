import { cn } from '../../lib/utils';

const success = 'bg-success-soft text-success-base';
const danger = 'bg-danger-soft text-danger-base';
const warning = 'bg-warning-soft text-warning-base';
const primary = 'bg-primary-soft text-primary-600';
const neutral = 'bg-surface-100 text-text-muted';

const tones = {
  active: success,
  paid: success,
  safe: success,
  received: success,
  bought: success,
  approved: primary,
  planned: primary,
  expected: primary,
  converted_to_goal: primary,
  waiting: warning,
  warning,
  paused: warning,
  unpaid: warning,
  late: danger,
  exceeded: danger,
  cancelled: neutral,
  closed: neutral,
  archived: neutral,
  inactive: neutral,
  expense: danger,
  income: success,
  want: warning,
  need: primary,
  saving: success,
  debt: danger,
  cash: success,
  bank: primary,
  e_wallet: warning,
  digital_bank: primary,
  daily_spending: primary,
  salary: success,
  savings: success,
  couple_savings: primary,
  emergency_fund: danger,
  bills: warning,
  wishlist: primary,
  investment: success,
  account_allocation: primary,
  manual: success,
};

// Shown when the caller passes only the raw API value.
const labels = {
  active: 'Aktif',
  inactive: 'Nonaktif',
  paused: 'Dijeda',
  archived: 'Diarsipkan',
  planned: 'Direncanakan',
  closed: 'Ditutup',
  draft: 'Draf',
  paid: 'Lunas',
  unpaid: 'Belum dibayar',
  late: 'Terlambat',
  waiting: 'Menunggu',
  approved: 'Direncanakan',
  bought: 'Dibeli',
  cancelled: 'Dibatalkan',
  converted_to_goal: 'Jadi target',
  completed: 'Selesai',
  income: 'Pemasukan',
  expense: 'Pengeluaran',
  both: 'Keduanya',
  need: 'Kebutuhan',
  want: 'Keinginan',
  saving: 'Tabungan',
  debt: 'Cicilan',
};

export default function StatusBadge({ value, children }) {
  return (
    <span className={cn('inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold capitalize', tones[value] || neutral)}>
      {children || labels[value] || value || '-'}
    </span>
  );
}
