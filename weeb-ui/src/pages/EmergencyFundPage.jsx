import AccountPurposeTransactionsPage from '../features/finance/AccountPurposeTransactionsPage';

export default function EmergencyFundPage() {
  return (
    <AccountPurposeTransactionsPage
      title="Dana Darurat"
      description="Pantau total saldo rekening dana darurat dan catat penambahan dana darurat sebagai transaksi."
      purpose="emergency_fund"
      createLabel="Tambah dana darurat"
      emptyTitle="Belum ada transaksi dana darurat"
      emptyDescription="Catat penambahan pertama agar saldo dana darurat mulai tercatat."
    />
  );
}
