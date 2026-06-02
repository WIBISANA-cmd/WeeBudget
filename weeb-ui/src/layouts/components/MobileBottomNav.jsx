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
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border-subtle bg-white/95 px-2 py-2 backdrop-blur md:hidden">
      {items.map((item) => (
        <NavLink key={item.path} to={item.path} className={({ isActive }) => cn('flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] transition-colors', isActive ? 'bg-primary-500/10 text-primary-600' : 'text-text-muted hover:text-primary-600')}>
          <item.icon size={18} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
