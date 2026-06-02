import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowRightLeft, PieChart, Target, X, BellRing, Repeat, FileText, Lightbulb, HeartHandshake, Settings, ListChecks, Calculator, CalendarRange, Landmark } from 'lucide-react';
import { cn } from '../../lib/utils';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ArrowRightLeft, label: 'Transaksi', path: '/transactions' },
  { icon: Landmark, label: 'Rekening', path: '/accounts' },
  { icon: PieChart, label: 'Kategori', path: '/categories' },
  { icon: Calculator, label: 'Planner', path: '/budget-planner' },
  { icon: CalendarRange, label: 'Periode', path: '/periods' },
  { icon: Target, label: 'Tabungan', path: '/savings' },
  { icon: HeartHandshake, label: 'Tabungan Berdua', path: '/couple-savings' },
  { icon: HeartHandshake, label: 'Dana Darurat', path: '/emergency-fund' },
  { icon: BellRing, label: 'Tagihan', path: '/bills' },
  { icon: Repeat, label: 'Rutin', path: '/recurring-transactions' },
  { icon: ListChecks, label: 'Wishlist', path: '/wishlist' },
  { icon: FileText, label: 'Laporan', path: '/reports' },
  { icon: Lightbulb, label: 'Insight', path: '/insights' },
  { icon: Settings, label: 'Profil', path: '/profile' },
];

export default function Sidebar({ isOpen, close }) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-text-title/30 backdrop-blur-sm md:hidden"
          onClick={close}
        />
      )}
      
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-border-subtle flex flex-col transition-transform duration-300 md:relative md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-20 px-6 border-b border-border-subtle">
          <div className="text-2xl font-outfit font-bold text-primary-500 tracking-wide">
            WeeBudget
          </div>
          <button onClick={close} className="p-2 text-text-muted hover:text-primary-600 md:hidden">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={close}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium",
                isActive 
                  ? "bg-primary-500/10 text-primary-600 border border-primary-500/20 shadow-sm shadow-primary-500/10" 
                  : "text-text-muted hover:bg-surface-100 hover:text-text-title"
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} className={cn(
                    "transition-colors",
                    isActive ? "text-primary-600" : "text-text-muted group-hover:text-primary-600"
                  )} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
