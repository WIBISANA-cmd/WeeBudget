import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold text-text-title">Halaman tidak ditemukan</h1>
      <p className="mt-3 max-w-md text-text-muted">Halaman yang kamu cari tidak tersedia di WeeB.</p>
      <Link to="/dashboard" className="mt-6"><Button>Kembali ke dashboard</Button></Link>
    </div>
  );
}
