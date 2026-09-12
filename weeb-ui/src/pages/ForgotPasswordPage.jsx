import { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { apiPost } from '../api/http';
import AuthShell, { AuthField, Key, Mail } from '../components/auth/AuthShell';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({
    email: '',
    otp: '',
    password: '',
    password_confirmation: '',
  });

  if (localStorage.getItem('weeb_auth_token')) {
    return <Navigate to="/dashboard" replace />;
  }

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const readError = (err, fallback) => {
    const errors = err.response?.data?.errors;
    return errors ? Object.values(errors).flat()[0] : err.response?.data?.message || fallback;
  };

  const requestOtp = async () => {
    const response = await apiPost('/auth/forgot-password', { email: form.email });
    setNotice(response.message || 'Kode OTP sudah dikirim ke email kamu.');
    setStep('otp');
  };

  const submitReset = async () => {
    await apiPost('/auth/reset-password', form);
    navigate('/login', { replace: true, state: { message: 'Password berhasil diperbarui.' } });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (step === 'otp' && form.password !== form.password_confirmation) {
      setError('Konfirmasi password tidak cocok.');
      setLoading(false);
      return;
    }

    try {
      await (step === 'email' ? requestOtp() : submitReset());
    } catch (err) {
      setError(readError(err, 'Permintaan gagal. Coba lagi.'));
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      await requestOtp();
    } catch (err) {
      setError(readError(err, 'Gagal mengirim ulang kode.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      mode="login"
      title={step === 'email' ? 'Lupa Password' : 'Verifikasi & Password Baru'}
      description={
        step === 'email'
          ? 'Masukkan email akunmu. Kami kirimkan kode OTP 6 digit untuk mengatur ulang password.'
          : 'Masukkan kode OTP dari email beserta password barumu. Kode berlaku 15 menit.'
      }
      onSubmit={handleSubmit}
      submitLabel={step === 'email' ? 'Kirim Kode OTP' : 'Simpan Password Baru'}
      submitLoading={isLoading}
      error={error}
      footer={(
        <>
          Ingat passwordmu?{' '}
          <Link to="/login" className="font-medium text-primary-600 transition-colors hover:text-primary-500">
            Kembali ke login
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
        value={form.email}
        onChange={update('email')}
        readOnly={step === 'otp'}
        required
      />

      {step === 'otp' && (
        <>
          {notice && (
            <div className="rounded-xl border border-primary-500/25 bg-primary-500/10 px-4 py-3 text-sm text-primary-600">
              {notice}
            </div>
          )}

          <AuthField
            label="Kode OTP"
            icon={ShieldCheck}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="123456"
            value={form.otp}
            onChange={update('otp')}
            required
          />

          <AuthField
            label="Password Baru"
            icon={Key}
            type="password"
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
            minLength={8}
            value={form.password}
            onChange={update('password')}
            required
          />

          <AuthField
            label="Konfirmasi Password Baru"
            icon={Key}
            type="password"
            autoComplete="new-password"
            placeholder="Ulangi password baru"
            minLength={8}
            value={form.password_confirmation}
            onChange={update('password_confirmation')}
            required
          />

          <div className="flex justify-between text-xs">
            <button
              type="button"
              onClick={() => { setStep('email'); setError(''); setNotice(''); }}
              className="text-text-muted transition-colors hover:text-text-title"
            >
              Ganti email
            </button>
            <button
              type="button"
              onClick={resendOtp}
              disabled={isLoading}
              className="text-primary-600 transition-colors hover:text-primary-500 disabled:opacity-50"
            >
              Kirim ulang kode
            </button>
          </div>
        </>
      )}
    </AuthShell>
  );
}
