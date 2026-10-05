import { ArrowRight, Globe, Key, LayoutDashboard, Mail, PiggyBank, ShieldAlert, User, Wallet } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import { cn } from '../../lib/utils';

function AuthField({ label, icon: Icon, className, ...props }) {
  return (
    <div className="space-y-1">
      <label className="ml-1 text-sm font-medium text-text-muted">{label}</label>
      <div className="relative">
        <input
          className={cn(
            'w-full rounded-xl border border-border-subtle bg-surface-100 px-4 py-3.5 pl-11 text-text-title placeholder:text-text-muted transition-all duration-300',
            'focus:border-primary-500 focus:bg-surface-panel focus:outline-none',
            className,
          )}
          {...props}
        />
        <Icon className="absolute left-4 top-3.5 h-5 w-5 text-text-muted" />
      </div>
    </div>
  );
}

function FeatureItem({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-start gap-4 transition-transform duration-300 hover:translate-x-2">
      <div className="rounded-xl bg-blue-500 p-3 text-white">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-blue-100">{desc}</p>
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
    <main className="relative min-h-screen overflow-hidden bg-bg-base px-4 py-6 font-sans text-text-body md:px-6 md:py-8">

      <div className="fixed right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-2xl border border-border-subtle bg-surface-panel shadow-card md:grid-cols-[1fr_0.95fr]">
          <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-14">
            <div className="mb-10 flex items-center gap-3">
              <div className="rounded-xl border border-border-strong bg-primary-soft p-3">
                <Wallet className="h-8 w-8 text-primary-500" />
              </div>
              <span className="text-2xl font-bold text-text-title">WeeB</span>
            </div>

            <div>
              <h1 className="mb-2 text-3xl font-bold text-text-title">{title}</h1>
              <p className="mb-8 text-sm text-text-muted">{description}</p>

              <form className="space-y-5" onSubmit={onSubmit}>
                {children}

                {error && (
                  <div className="rounded-xl border border-danger-line bg-danger-soft px-4 py-3 text-sm text-danger-base">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-3.5 font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitLoading ? 'Memproses...' : submitLabel}
                  {!submitLoading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              {onGoogle && (
                <>
                <div className="my-6 flex items-center gap-4">
                  <div className="h-px flex-1 bg-border-subtle" />
                  <span className="text-xs font-medium text-text-muted">ATAU</span>
                  <div className="h-px flex-1 bg-border-subtle" />
                </div>

                <button
                  type="button"
                  onClick={onGoogle}
                  disabled={googleLoading}
                  className="ui-hover-surface flex w-full items-center justify-center gap-3 rounded-xl border border-border-subtle bg-surface-100 px-4 py-3.5 font-medium text-text-title disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Globe className="h-5 w-5 text-primary-500" />
                  {googleLoading ? 'Menghubungkan...' : 'Lanjutkan dengan Google'}
                </button>
                </>
              )}

              <div className="mt-8 text-center text-sm text-text-muted">{footer}</div>
            </div>
          </div>

          {/* Brand panel: stays blue in both themes, so its own text keeps fixed colors. */}
          <div className="relative hidden overflow-hidden bg-blue-600 p-8 sm:p-10 lg:flex lg:flex-col lg:justify-between lg:p-14">
            <div className="absolute -bottom-10 -right-10 h-64 w-64 rounded-full border border-blue-500" />
            <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full border border-blue-500" />

            <div className="relative z-10">
              <span className="mb-4 block text-sm font-semibold text-blue-200">
                WeeB Finance Platform
              </span>
              <h2 className="text-3xl font-bold leading-snug text-white">
                Dashboard, planner, tabungan, dan dana darurat dalam{' '}
                <span className="text-blue-200">
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

            <div className="relative z-10 mt-12 border-t border-blue-500 pt-6">
              <p className="text-xs leading-relaxed text-blue-100">
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
