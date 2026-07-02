import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { apiGet, apiPost } from '../api/http';
import AuthShell, { AuthField, Key, Mail } from '../components/auth/AuthShell';

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
    <AuthShell
      mode="login"
      title="Masuk ke Akun"
      description="Gunakan akun yang sudah terdaftar untuk mengakses dashboard keuanganmu."
      onSubmit={loginWithPassword}
      submitLabel="Masuk dengan Email"
      submitLoading={isPasswordLoading}
      onGoogle={loginWithGoogle}
      googleLoading={isLoading}
      error={error}
      footer={(
        <>
          Belum punya akun?{' '}
          <Link to="/register" className="font-medium text-blue-400 transition-colors hover:text-blue-300">
            Daftar di sini
          </Link>
        </>
      )}
    >
      <AuthField
        label="Email"
        icon={Mail}
        type="email"
        autoComplete="email"
        placeholder="nama@email.com"
        value={credentials.email}
        onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))}
        required
      />

      <div className="space-y-1">
        <AuthField
          label="Password"
          icon={Key}
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={credentials.password}
          onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
          required
        />
        <div className="flex justify-end">
          <button type="button" className="text-xs text-blue-400 transition-colors hover:text-blue-300">
            Lupa password?
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
