import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { User, Mail, KeyRound } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ThemeToggle from '../components/ui/ThemeToggle';
import { apiPost } from '../api/http';

export default function RegisterPage() {
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });

  if (localStorage.getItem('weeb_auth_token')) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleRegister = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.password_confirmation) {
      setError('Konfirmasi password tidak cocok.');
      setLoading(false);
      return;
    }

    try {
      const response = await apiPost('/auth/register', formData);
      localStorage.setItem('weeb_auth_token', response.data.token);
      window.location.href = '/dashboard';
    } catch (err) {
      const message = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat()[0]
        : err.response?.data?.message || 'Registrasi gagal. Coba lagi.';
      setError(message);
      setLoading(false);
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
            <h1 className="mt-6 text-3xl font-bold text-text-title md:text-4xl">Buat Akun WeeB</h1>
            <p className="mt-3 text-sm leading-6 text-text-muted md:text-base">
              Daftar sekarang untuk mulai mengelola keuangan, merancang budget, tabungan, dan dana darurat dalam satu tempat.
            </p>

            <form onSubmit={handleRegister} className="mt-8 space-y-4">
              <Input
                label="Nama Lengkap"
                type="text"
                autoComplete="name"
                icon={User}
                value={formData.name}
                onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                required
              />
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                icon={Mail}
                value={formData.email}
                onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                required
              />
              <Input
                label="Password"
                type="password"
                autoComplete="new-password"
                icon={KeyRound}
                value={formData.password}
                onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
                required
              />
              <Input
                label="Konfirmasi Password"
                type="password"
                autoComplete="new-password"
                icon={KeyRound}
                value={formData.password_confirmation}
                onChange={(event) => setFormData((current) => ({ ...current, password_confirmation: event.target.value }))}
                required
              />

              {error && <p className="rounded-xl bg-danger-base/10 px-4 py-3 text-sm text-danger-base">{error}</p>}

              <Button type="submit" isLoading={isLoading} className="w-full">
                Daftar Akun Baru
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-text-muted">
              Sudah punya akun?{' '}
              <Link to="/login" className="font-semibold text-primary-500 hover:text-primary-600 hover:underline">
                Masuk di sini
              </Link>
            </div>
          </div>
          <div className="hidden bg-gradient-to-br from-primary-500 to-sky-500 p-10 text-white md:block">
            <div className="flex h-full flex-col justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-white/70">WeeB Finance</p>
                <h2 className="mt-4 text-3xl font-bold">Langkah awal menuju kebebasan finansial yang teratur.</h2>
              </div>
              <div className="rounded-2xl bg-white/15 p-5 backdrop-blur">
                <p className="text-sm leading-6 text-white/85">
                  Semua data tersimpan aman dengan enkripsi modern. Anda dapat menggunakan fitur alokasi otomatis dan pemisah pos tabungan setelah pendaftaran.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
