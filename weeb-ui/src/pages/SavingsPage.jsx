import { lazy, Suspense, useState } from 'react';
import AccountPurposeTransactionsPage from '../features/finance/AccountPurposeTransactionsPage';
import Segmented from '../components/ui/Segmented';
import { GoldSavingsSkeleton } from '../features/finance/GoldSavingsSkeleton';

const GoldSavingsPanel = lazy(() => import('../features/finance/GoldSavingsPanel'));

const tabs = [
  { value: 'cash', label: 'Cash' },
  { value: 'gold', label: 'Emas' },
];

export default function SavingsPage() {
  const [activeTab, setActiveTab] = useState('cash');
  const switcher = <Segmented label="Jenis tabungan" size="md" options={tabs} value={activeTab} onChange={setActiveTab} className="border border-border-subtle bg-surface-panel" />;

  if (activeTab === 'cash') {
    return (
      <AccountPurposeTransactionsPage
        title="Tabungan"
        purpose="savings"
        createLabel="Tambah tabungan"
        emptyTitle="Belum ada transaksi tabungan"
        emptyDescription="Catat setoran pertama agar riwayat tabungan mulai terbentuk."
        headerExtra={switcher}
      />
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-text-title md:text-2xl">Tabungan</h1>
        {switcher}
      </header>
      <Suspense fallback={<GoldSavingsSkeleton />}>
        <GoldSavingsPanel />
      </Suspense>
    </div>
  );
}
