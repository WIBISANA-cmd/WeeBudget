import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const titles = {
  '/': 'WeeBudget - Smart Personal Finance',
  '/login': 'Masuk - WeeBudget',
  '/dashboard': 'Dashboard - WeeBudget',
  '/onboarding': 'Setup Awal - WeeBudget',
  '/transactions': 'Transaksi - WeeBudget',
  '/transactions/income': 'Pemasukan - WeeBudget',
  '/transactions/expense': 'Pengeluaran - WeeBudget',
  '/accounts': 'Rekening - WeeBudget',
  '/categories': 'Kategori - WeeBudget',
  '/budget-planner': 'Budget Planner - WeeBudget',
  '/periods': 'Periode - WeeBudget',
  '/savings': 'Tabungan - WeeBudget',
  '/couple-savings': 'Tabungan Berdua - WeeBudget',
  '/emergency-fund': 'Dana Darurat - WeeBudget',
  '/bills': 'Tagihan - WeeBudget',
  '/recurring-transactions': 'Transaksi Rutin - WeeBudget',
  '/reports': 'Laporan - WeeBudget',
  '/insights': 'Insight - WeeBudget',
  '/wishlist': 'Wishlist - WeeBudget',
  '/profile': 'Profil - WeeBudget',
  '/users': 'Manajemen User - WeeBudget',
};

export default function PageTitle() {
  const location = useLocation();

  useEffect(() => {
    document.title = titles[location.pathname] || 'WeeBudget - Smart Personal Finance';
  }, [location.pathname]);

  return null;
}
