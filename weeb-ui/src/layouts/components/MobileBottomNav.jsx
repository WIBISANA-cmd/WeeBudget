import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Landmark, Plus, ArrowRightLeft, FileText, Mic } from 'lucide-react';
import { cn } from '../../lib/utils';
import VoiceTransactionModal from '../../components/VoiceTransactionModal';

const navItemClass = ({ isActive }) => cn(
  'flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-[10px] font-semibold transition-all duration-200',
  isActive
    ? 'bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400'
    : 'text-text-muted hover:text-primary-600',
);

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [isFabOpen, setFabOpen] = useState(false);

  useEffect(() => {
    if (!isFabOpen) return undefined;

    const close = (event) => {
      if (event.key === 'Escape') setFabOpen(false);
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [isFabOpen]);

  // Each action leaves from the trigger and lands on its own arc above it; closing plays in reverse.
  const actions = [
    {
      key: 'voice',
      label: 'Catat via Suara AI',
      icon: Mic,
      offset: 'translate(-1.9rem, -4.6rem)',
      className: 'bg-violet-600 text-white',
      onClick: () => setVoiceModalOpen(true),
    },
    {
      key: 'manual',
      label: 'Tambah Transaksi',
      icon: Plus,
      offset: 'translate(1.9rem, -4.6rem)',
      className: 'bg-primary-500 text-white',
      onClick: () => navigate('/transactions', { state: { openCreate: true } }),
    },
  ];

  return (
    <>
      {/* Tap-away layer: fades in with the actions so a stray tap closes instead of hitting the page. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden={!isFabOpen}
        onClick={() => setFabOpen(false)}
        className={cn(
          'fixed inset-0 z-30 bg-black/25 backdrop-blur-[2px] transition-opacity duration-300 md:hidden',
          isFabOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-2 md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-center gap-1 rounded-[28px] border border-border-subtle bg-surface-panel/96 p-2 shadow-[0_18px_48px_-24px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          <NavLink to="/dashboard" className={navItemClass}>
            <LayoutDashboard size={20} />
            <span>Home</span>
          </NavLink>

          <NavLink to="/transactions" className={navItemClass}>
            <ArrowRightLeft size={20} />
            <span>Transaksi</span>
          </NavLink>

          {/* Center FAB + its two pop-up actions */}
          <div className="relative flex items-center justify-center">
            {actions.map((action, index) => (
              <button
                key={action.key}
                type="button"
                title={action.label}
                aria-label={action.label}
                tabIndex={isFabOpen ? 0 : -1}
                onClick={() => {
                  setFabOpen(false);
                  action.onClick();
                }}
                style={{
                  transform: isFabOpen ? action.offset : 'translate(0, 0) scale(0.4)',
                  // Opening staggers outward; closing collapses back in the same order, reversed.
                  transitionDelay: `${(isFabOpen ? index : actions.length - 1 - index) * 60}ms`,
                }}
                className={cn(
                  'absolute flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-90',
                  action.className,
                  isFabOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
              >
                <action.icon size={20} />
              </button>
            ))}

            <button
              type="button"
              onClick={() => setFabOpen((open) => !open)}
              aria-expanded={isFabOpen}
              aria-label={isFabOpen ? 'Tutup menu tambah' : 'Buka menu tambah'}
              className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg shadow-primary-500/40 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-90"
            >
              <Plus
                size={24}
                className={cn('transition-transform duration-300', isFabOpen ? 'rotate-135' : 'rotate-0')}
              />
            </button>
          </div>

          <NavLink to="/accounts" className={navItemClass}>
            <Landmark size={20} />
            <span>Rekening</span>
          </NavLink>

          <NavLink to="/reports" className={navItemClass}>
            <FileText size={20} />
            <span>Laporan</span>
          </NavLink>
        </div>
      </nav>

      <VoiceTransactionModal open={voiceModalOpen} onClose={() => setVoiceModalOpen(false)} />
    </>
  );
}
