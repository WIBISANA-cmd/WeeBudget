import { lazy, Suspense, useState } from 'react';
import AccountPurposeTransactionsPage from '../features/finance/AccountPurposeTransactionsPage';
import LoadingSkeleton from '../components/feedback/LoadingSkeleton';
import { cn } from '../lib/utils';

const GoldSavingsPanel = lazy(() => import('../features/finance/GoldSavingsPanel'));

export default function SavingsPage() {
  const [activeTab, setActiveTab] = useState('cash');

  const tabs = [
    { id: 'cash', label: 'CASH', helper: 'Tabungan rekening yang sudah berjalan saat ini.' },
    { id: 'gold', label: 'EMAS', helper: 'Pantau tabungan emas berdasarkan gramasi dan histori harga.' },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-title md:text-3xl">Tabungan</h1>
        </div>
        <div className="inline-flex rounded-2xl border border-border-subtle bg-surface-100 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                activeTab === tab.id
                  ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/20'
                  : 'text-text-body hover:text-primary-600'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="rounded-2xl border border-border-subtle bg-surface-100 px-4 py-3 text-sm text-text-muted">
        {tabs.find((tab) => tab.id === activeTab)?.helper}
      </div>

      {activeTab === 'cash' ? (
        <AccountPurposeTransactionsPage
          title="Tabungan Cash"
          purpose="savings"
          createLabel="Tambah tabungan"
          emptyTitle="Belum ada transaksi tabungan"
          emptyDescription="Catat setoran pertama agar riwayat tabungan mulai terbentuk."
        />
      ) : (
        <Suspense fallback={<LoadingSkeleton rows={6} />}>
          <GoldSavingsPanel />
        </Suspense>
      )}
    </div>
  );
}
