import AccountPurposeTransactionsPage from '../features/finance/AccountPurposeTransactionsPage';

export default function SavingsPage() {
  return (
    <AccountPurposeTransactionsPage
      title="Tabungan"
      description="Pantau total saldo rekening tabungan dan catat setoran tabungan sebagai transaksi."
      purpose="savings"
      createLabel="Tambah tabungan"
      emptyTitle="Belum ada transaksi tabungan"
      emptyDescription="Catat setoran pertama agar riwayat tabungan mulai terbentuk."
    />
  );
}
