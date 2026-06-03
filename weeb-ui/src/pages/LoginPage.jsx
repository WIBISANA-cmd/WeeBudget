import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { KeyRound, Wallet } from 'lucide-react';
import Button from '../components/ui/Button';
import { apiGet } from '../api/http';

export default function LoginPage() {
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (localStorage.getItem('weeb_auth_token')) {
    return <Navigate to="/dashboard" replace />;
  }

  const loginWithGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet('/auth/google/redirect');
      window.location.href = response.data.url;
    } catch (err) {
      setError(err.response?.data?.message || 'Login Google belum bisa dimulai.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg-base px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-3xl border border-border-subtle bg-white shadow-xl shadow-slate-900/10 md:grid-cols-[1fr_0.9fr]">
          <div className="p-8 md:p-12">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-600">
              <Wallet size={26} />
            </div>
            <h1 className="mt-6 text-3xl font-bold text-text-title md:text-4xl">Masuk ke WeeB</h1>
            <p className="mt-3 text-sm leading-6 text-text-muted md:text-base">
              Gunakan akun Google terlebih dahulu agar data keuanganmu tersimpan aman dan terpisah per pengguna.
            </p>
            <div className="mt-8 space-y-3">
              <Button onClick={loginWithGoogle} isLoading={isLoading} className="w-full">
                {!isLoading && <KeyRound size={18} className="mr-2" />}
                Masuk dengan Google
              </Button>
              {error && <p className="rounded-xl bg-danger-base/10 px-4 py-3 text-sm text-danger-base">{error}</p>}
            </div>
          </div>
          <div className="hidden bg-gradient-to-br from-primary-500 to-sky-500 p-10 text-white md:block">
            <div className="flex h-full flex-col justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-white/70">WeeB Finance</p>
                <h2 className="mt-4 text-3xl font-bold">Dashboard, planner, tabungan, dan dana darurat dalam satu akun.</h2>
              </div>
              <div className="rounded-2xl bg-white/15 p-5 backdrop-blur">
                <p className="text-sm leading-6 text-white/85">Login Google memakai OAuth resmi. Token API disimpan di browser dan bisa dihapus lewat tombol keluar.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
