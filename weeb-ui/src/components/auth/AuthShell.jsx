import { ArrowRight, Globe, Key, LayoutDashboard, Mail, PiggyBank, ShieldAlert, User, Wallet } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import { cn } from '../../lib/utils';

function AuthField({ label, icon: Icon, className, ...props }) {
  return (
    <div className="space-y-1">
      <label className="ml-1 text-sm font-medium text-slate-400">{label}</label>
      <div className="relative">
        <input
          className={cn(
            'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 pl-11 text-white placeholder:text-slate-500 transition-all duration-300',
            'focus:border-blue-500/50 focus:bg-white/10 focus:outline-none',
            className,
          )}
          {...props}
        />
        <Icon className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
      </div>
    </div>
  );
}

function FeatureItem({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-start gap-4 transition-transform duration-300 hover:translate-x-2">
      <div className="rounded-xl bg-white/10 p-3 text-white backdrop-blur-sm">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-blue-100/70">{desc}</p>
      </div>
    </div>
  );
}

export default function AuthShell({
  mode = 'login',
  title,
  description,
  onSubmit,
  submitLabel,
  submitLoading = false,
  onGoogle,
  googleLoading = false,
  error,
  footer,
  children,
}) {
  const isLogin = mode === 'login';

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0a] px-4 py-6 font-sans text-gray-200 md:px-6 md:py-8">
      <div className="absolute left-[-10%] top-[-10%] h-[40rem] w-[40rem] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[40rem] w-[40rem] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      <div className="fixed right-4 top-4 z-20">
        <ThemeToggle showLabel />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.02] shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl md:grid-cols-[1fr_0.95fr]">
          <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-14">
            <div className="mb-10 flex items-center gap-3">
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                <Wallet className="h-8 w-8 text-blue-400" />
              </div>
              <span className="text-2xl font-bold tracking-wide text-white">WeeB</span>
            </div>

            <div>
              <h1 className="mb-2 text-3xl font-bold text-white">{title}</h1>
              <p className="mb-8 text-sm text-slate-400">{description}</p>

              <form className="space-y-5" onSubmit={onSubmit}>
                {children}

                {error && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 font-medium text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitLoading ? 'Memproses...' : submitLabel}
                  {!submitLoading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs font-medium text-slate-500">ATAU</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <button
                type="button"
                onClick={onGoogle}
                disabled={googleLoading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 font-medium text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Globe className="h-5 w-5 text-blue-400" />
                {googleLoading ? 'Menghubungkan...' : 'Lanjutkan dengan Google'}
              </button>

              <div className="mt-8 text-center text-sm text-slate-400">{footer}</div>
            </div>
          </div>

          <div className="relative hidden overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-800 p-8 sm:p-10 lg:flex lg:flex-col lg:justify-between lg:p-14">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.22),_transparent_48%)] opacity-30" />
            <div className="absolute -bottom-10 -right-10 h-64 w-64 rounded-full border border-white/20" />
            <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full border border-white/10" />

            <div className="relative z-10">
              <span className="mb-4 block text-sm font-semibold uppercase tracking-wider text-blue-200">
                WeeB Finance Platform
              </span>
              <h2 className="text-3xl font-bold leading-snug text-white">
                Dashboard, planner, tabungan, dan dana darurat dalam{' '}
                <span className="bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent">
                  satu ekosistem.
                </span>
              </h2>

              <div className="mt-12 space-y-6">
                <FeatureItem
                  icon={LayoutDashboard}
                  title="Smart Dashboard"
                  desc="Pantau arus kas harianmu dengan visualisasi yang interaktif."
                />
                <FeatureItem
                  icon={PiggyBank}
                  title="Auto-Saving"
                  desc="Alokasikan tabungan secara otomatis setiap bulan."
                />
                <FeatureItem
                  icon={ShieldAlert}
                  title="Emergency Fund"
                  desc="Siapkan dana darurat dengan aman dan terpisah."
                />
              </div>
            </div>

            <div className="relative z-10 mt-12 border-t border-white/20 pt-6">
              <p className="text-xs leading-relaxed text-blue-100/70">
                {isLogin
                  ? 'Login Google memakai OAuth resmi. Token API disimpan aman di browser dan bisa dihapus kapan saja lewat tombol keluar.'
                  : 'Daftar dengan email atau Google untuk mulai memakai seluruh fitur keuangan WeeB dalam satu akun yang aman.'}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export { AuthField, Mail, Key, User };
