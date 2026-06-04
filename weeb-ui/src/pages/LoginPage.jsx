import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { KeyRound, Mail } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ThemeToggle from '../components/ui/ThemeToggle';
import { apiGet, apiPost } from '../api/http';

export default function LoginPage() {
  const [isLoading, setLoading] = useState(false);
  const [isPasswordLoading, setPasswordLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState({ email: '', password: '' });

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

  const loginWithPassword = async (event) => {
    event.preventDefault();
    setPasswordLoading(true);
    setError('');
    try {
      const response = await apiPost('/auth/login', credentials);
      localStorage.setItem('weeb_auth_token', response.data.token);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'Login email dan password belum berhasil.');
      setPasswordLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg-base px-4 py-8">
      <div className="fixed right-4 top-4 z-10">
        <ThemeToggle showLabel />
      </div>
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-3xl border border-border-subtle bg-surface-panel shadow-xl shadow-card-soft md:grid-cols-[1fr_0.9fr]">
          <div className="p-8 md:p-12">
            <img src="/logo-app.png" alt="WeeBudget" className="h-16 w-auto object-contain" />
            <h1 className="mt-6 text-3xl font-bold text-text-title md:text-4xl">Masuk ke WeeB</h1>
            <p className="mt-3 text-sm leading-6 text-text-muted md:text-base">
              Gunakan akun Google terlebih dahulu agar data keuanganmu tersimpan aman dan terpisah per pengguna.
            </p>
            <form onSubmit={loginWithPassword} className="mt-8 space-y-4">
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                icon={Mail}
                value={credentials.email}
                onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))}
                required
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                icon={KeyRound}
                value={credentials.password}
                onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
                required
              />
              <Button type="submit" isLoading={isPasswordLoading} className="w-full">
                Masuk dengan Email
              </Button>
            </form>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                <span className="h-px flex-1 bg-border-subtle" />
                atau
                <span className="h-px flex-1 bg-border-subtle" />
              </div>
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
