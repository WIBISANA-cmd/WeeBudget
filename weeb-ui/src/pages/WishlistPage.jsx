import AccountPurposeTransactionsPage from '../features/finance/AccountPurposeTransactionsPage';

export default function WishlistPage() {
  return (
    <AccountPurposeTransactionsPage
      title="Wishlist"
      description="Pantau total saldo rekening wishlist dan catat dana yang disisihkan untuk keinginan sebagai transaksi."
      purpose="wishlist"
      createLabel="Tambah dana wishlist"
      emptyTitle="Belum ada transaksi wishlist"
      emptyDescription="Catat dana pertama yang kamu sisihkan untuk wishlist."
      needType="want"
      typeLabel="Keinginan"
    />
  );
}
