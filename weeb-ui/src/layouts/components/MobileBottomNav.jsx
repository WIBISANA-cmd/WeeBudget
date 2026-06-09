import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowRightLeft, Calculator, Target, Lightbulb } from 'lucide-react';
import { cn } from '../../lib/utils';

const items = [
  { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
  { icon: ArrowRightLeft, label: 'Transaksi', path: '/transactions' },
  { icon: Calculator, label: 'Planner', path: '/budget-planner' },
  { icon: Target, label: 'Nabung', path: '/savings' },
  { icon: Lightbulb, label: 'Insight', path: '/insights' },
];

export default function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-2 md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[28px] border border-border-subtle bg-surface-panel/96 p-2 shadow-[0_18px_48px_-24px_rgba(15,23,42,0.35)] backdrop-blur-xl">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              'flex min-h-[60px] flex-col items-center justify-center gap-1.5 rounded-2xl px-1.5 py-2 text-[11px] font-medium transition-all duration-200',
              isActive
                ? 'bg-primary-500 text-white shadow-glow-primary'
                : 'text-text-muted hover:bg-surface-100 hover:text-primary-600'
            )}
          >
            <item.icon size={19} />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
