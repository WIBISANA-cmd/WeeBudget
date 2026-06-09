import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ArrowRightLeft, PieChart, Target, X, BellRing, Repeat, FileText, Lightbulb, HeartHandshake, Settings, ListChecks, Calculator, CalendarRange, Landmark, Users, ChevronDown, WalletCards, ShieldCheck, ChartNoAxesCombined, SlidersHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';

const menuGroups = [
  {
    key: 'main',
    label: 'Utama',
    icon: LayoutDashboard,
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    ],
  },
  {
    key: 'finance',
    label: 'Kelola Keuangan',
    icon: WalletCards,
    items: [
      { icon: ArrowRightLeft, label: 'Transaksi', path: '/transactions' },
      { icon: Landmark, label: 'Rekening', path: '/accounts' },
      { icon: Calculator, label: 'Planner', path: '/budget-planner' },
    ],
  },
  {
    key: 'goals',
    label: 'Tujuan & Proteksi',
    icon: ShieldCheck,
    items: [
      { icon: Target, label: 'Tabungan', path: '/savings' },
      { icon: HeartHandshake, label: 'Tabungan Berdua', path: '/couple-savings' },
      { icon: HeartHandshake, label: 'Dana Darurat', path: '/emergency-fund' },
      { icon: ListChecks, label: 'Wishlist', path: '/wishlist' },
    ],
  },
  {
    key: 'schedule',
    label: 'Jadwal',
    icon: BellRing,
    items: [
      { icon: BellRing, label: 'Tagihan', path: '/bills' },
      { icon: Repeat, label: 'Rutin', path: '/recurring-transactions' },
    ],
  },
  {
    key: 'insights',
    label: 'Analitik',
    icon: ChartNoAxesCombined,
    items: [
      { icon: FileText, label: 'Laporan', path: '/reports' },
      { icon: Lightbulb, label: 'Insight', path: '/insights' },
    ],
  },
  {
    key: 'settings',
    label: 'Pengaturan',
    icon: SlidersHorizontal,
    items: [
      { icon: CalendarRange, label: 'Periode', path: '/periods' },
      { icon: PieChart, label: 'Kategori', path: '/categories' },
      { icon: Settings, label: 'Profil', path: '/profile' },
      { icon: Users, label: 'User', path: '/users' },
    ],
  },
];

function isPathActive(pathname, path) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function Sidebar({ isOpen, close }) {
  const { pathname } = useLocation();
  const activeGroupKeys = useMemo(
    () => menuGroups
      .filter((group) => group.items.some((item) => isPathActive(pathname, item.path)))
      .map((group) => group.key),
    [pathname]
  );
  const [openGroups, setOpenGroups] = useState(() => (
    menuGroups.reduce((groups, group) => ({
      ...groups,
      [group.key]: group.items.some((item) => isPathActive(pathname, item.path)),
    }), {})
  ));

  const toggleGroup = (key) => {
    setOpenGroups((groups) => ({ ...groups, [key]: !groups[key] }));
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-text-title/35 backdrop-blur-sm md:hidden"
          onClick={close}
        />
      )}
      
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[320px] flex-col border-r border-border-subtle bg-surface-panel/98 shadow-2xl shadow-slate-950/20 transition-transform duration-300 md:relative md:w-72 md:max-w-none md:translate-x-0 md:bg-surface-panel md:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between border-b border-border-subtle px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:h-20 md:px-6 md:py-0">
          <div>
            <img src="/logo-app.png" alt="WeeBudget" className="h-11 w-auto object-contain md:h-12" />
            <p className="mt-2 text-xs font-medium text-text-muted md:hidden">Navigasi utama, dibuat ringkas untuk penggunaan satu tangan.</p>
          </div>
          <button onClick={close} className="rounded-2xl p-2.5 text-text-muted transition-colors hover:bg-surface-100 hover:text-primary-600 md:hidden">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 space-y-3 overflow-y-auto px-4 py-5 md:px-4 md:py-6">
          {menuGroups.map((group) => {
            const isOpenGroup = openGroups[group.key] || activeGroupKeys.includes(group.key);
            const isActiveGroup = activeGroupKeys.includes(group.key);
            const singleItem = group.items.length === 1 ? group.items[0] : null;

            if (singleItem) {
              return (
                <NavLink
                  key={group.key}
                  to={singleItem.path}
                  onClick={close}
                  className={({ isActive }) => cn(
                    "group flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "bg-primary-500/10 text-primary-600 border border-primary-500/20 shadow-sm shadow-primary-500/10"
                      : "text-text-muted hover:bg-surface-100 hover:text-text-title"
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <singleItem.icon size={19} className={cn(
                        "shrink-0 transition-colors",
                        isActive ? "text-primary-600" : "text-text-muted group-hover:text-primary-600"
                      )} />
                      <span className="min-w-0 truncate">{singleItem.label}</span>
                    </>
                  )}
                </NavLink>
              );
            }

            return (
              <div key={group.key} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={isOpenGroup}
                  className={cn(
                    "flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-all duration-200",
                    isActiveGroup
                      ? "bg-surface-100 text-text-title"
                      : "text-text-muted hover:bg-surface-100 hover:text-text-title"
                  )}
                >
                  <group.icon size={19} className={cn("shrink-0 transition-colors", isActiveGroup ? "text-primary-600" : "text-text-muted")} />
                  <span className="min-w-0 flex-1 truncate">{group.label}</span>
                  <ChevronDown size={17} className={cn("shrink-0 transition-transform duration-200", isOpenGroup && "rotate-180")} />
                </button>

                {isOpenGroup && (
                  <div className="space-y-1 pl-3">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={close}
                        className={({ isActive }) => cn(
                          "group flex min-h-11 items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-primary-500/10 text-primary-600 border border-primary-500/20 shadow-sm shadow-primary-500/10"
                            : "text-text-muted hover:bg-surface-100 hover:text-text-title"
                        )}
                      >
                        {({ isActive }) => (
                          <>
                            <item.icon size={18} className={cn(
                              "shrink-0 transition-colors",
                              isActive ? "text-primary-600" : "text-text-muted group-hover:text-primary-600"
                            )} />
                            <span className="min-w-0 truncate">{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
