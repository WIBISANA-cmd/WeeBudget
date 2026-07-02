import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { apiGet, apiPost } from '../api/http';
import AuthShell, { AuthField, Key, Mail, User } from '../components/auth/AuthShell';

export default function RegisterPage() {
  const [isLoading, setLoading] = useState(false);
  const [isGoogleLoading, setGoogleLoading] = useState(false);
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

  const loginWithGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const response = await apiGet('/auth/google/redirect');
      window.location.href = response.data.url;
    } catch (err) {
      setError(err.response?.data?.message || 'Google signup belum bisa dimulai.');
      setGoogleLoading(false);
    }
  };

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
    <AuthShell
      mode="register"
      title="Buat Akun Baru"
      description="Mulai perjalanan finansialmu yang lebih baik dan terstruktur bersama WeeB."
      onSubmit={handleRegister}
      submitLabel="Daftar Sekarang"
      submitLoading={isLoading}
      onGoogle={loginWithGoogle}
      googleLoading={isGoogleLoading}
      error={error}
      footer={(
        <>
          Sudah punya akun?{' '}
          <Link to="/login" className="font-medium text-blue-400 transition-colors hover:text-blue-300">
            Masuk di sini
          </Link>
        </>
      )}
    >
      <AuthField
        label="Nama Lengkap"
        icon={User}
        type="text"
        autoComplete="name"
        placeholder="John Doe"
        value={formData.name}
        onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
        required
      />
      <AuthField
        label="Email"
        icon={Mail}
        type="email"
        autoComplete="email"
        placeholder="nama@email.com"
        value={formData.email}
        onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
        required
      />
      <AuthField
        label="Password"
        icon={Key}
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        value={formData.password}
        onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
        required
      />
      <AuthField
        label="Konfirmasi Password"
        icon={Key}
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        value={formData.password_confirmation}
        onChange={(event) => setFormData((current) => ({ ...current, password_confirmation: event.target.value }))}
        required
      />
    </AuthShell>
  );
}
