import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Landmark, Plus, FileText, Target, Mic, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import VoiceTransactionModal from '../../components/VoiceTransactionModal';

export default function MobileBottomNav() {
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-2 md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-center gap-1 rounded-[28px] border border-border-subtle bg-surface-panel/96 p-2 shadow-[0_18px_48px_-24px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          {/* 1. Home */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) => cn(
              'flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-[10px] font-semibold transition-all duration-200',
              isActive
                ? 'bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400'
                : 'text-text-muted hover:text-primary-600'
            )}
          >
            <LayoutDashboard size={20} />
            <span>Home</span>
          </NavLink>

          {/* 2. Rekening */}
          <NavLink
            to="/accounts"
            className={({ isActive }) => cn(
              'flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-[10px] font-semibold transition-all duration-200',
              isActive
                ? 'bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400'
                : 'text-text-muted hover:text-primary-600'
            )}
          >
            <Landmark size={20} />
            <span>Rekening</span>
          </NavLink>

          {/* 3. Add & AI Voice Buttons */}
          <div className="flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => setVoiceModalOpen(true)}
              aria-label="Catat via Suara AI"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white animate-neon-pulse-purple transition-transform duration-200 active:scale-90"
              title="Catat Suara AI"
            >
              <Mic size={18} className="text-violet-200" />
              <Sparkles size={10} className="absolute -right-0.5 -top-0.5 text-violet-200 animate-pulse" />
            </button>
            <NavLink
              to="/transactions"
              state={{ openCreate: true }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg shadow-primary-500/30 transition-transform duration-200 active:scale-90"
              title="Tambah Transaksi Manual"
            >
              <Plus size={22} />
            </NavLink>
          </div>

          {/* 4. Laporan */}
          <NavLink
            to="/reports"
            className={({ isActive }) => cn(
              'flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-[10px] font-semibold transition-all duration-200',
              isActive
                ? 'bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400'
                : 'text-text-muted hover:text-primary-600'
            )}
          >
            <FileText size={20} />
            <span>Laporan</span>
          </NavLink>

          {/* 5. Tabungan */}
          <NavLink
            to="/savings"
            className={({ isActive }) => cn(
              'flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-[10px] font-semibold transition-all duration-200',
              isActive
                ? 'bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400'
                : 'text-text-muted hover:text-primary-600'
            )}
          >
            <Target size={20} />
            <span>Tabungan</span>
          </NavLink>
        </div>
      </nav>

      {/* Voice AI Modal */}
      <VoiceTransactionModal
        open={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onSuccess={() => {
          // Trigger custom event or refresh if on transactions page
          window.dispatchEvent(new CustomEvent('transaction:created'));
        }}
      />
    </>
  );
}
