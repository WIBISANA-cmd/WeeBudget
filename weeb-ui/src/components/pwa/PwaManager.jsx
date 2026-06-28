import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';
import Button from '../ui/Button';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { ensureTransactionReminderSubscription } from '../../lib/pushNotifications';

const UPDATE_RELOAD_GUARD_KEY = 'weeb_pwa_update_reloaded_at';
const UPDATE_RELOAD_GUARD_MS = 15_000;

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function hasRecentUpdateReload() {
  if (typeof window === 'undefined') {
    return false;
  }

  const raw = window.sessionStorage.getItem(UPDATE_RELOAD_GUARD_KEY);
  if (!raw) {
    return false;
  }

  const lastReloadAt = Number(raw);
  return Number.isFinite(lastReloadAt) && Date.now() - lastReloadAt < UPDATE_RELOAD_GUARD_MS;
}

function markUpdateReload() {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(UPDATE_RELOAD_GUARD_KEY, String(Date.now()));
}

export default function PwaManager() {
  const { user } = useCurrentUser();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setInstalled] = useState(() => isStandaloneMode());
  const [showInstallCard, setShowInstallCard] = useState(false);
  const updateServiceWorkerRef = useRef(null);
  const hasReloadedForUpdateRef = useRef(hasRecentUpdateReload());

  useEffect(() => {
    let updateIntervalId;
    let unregisterVisibilitySync = null;

    updateServiceWorkerRef.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        if (hasReloadedForUpdateRef.current) return;
        updateServiceWorkerRef.current?.(true);
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;

        const activateWaitingWorker = async () => {
          const latestRegistration = await navigator.serviceWorker?.getRegistration();

          if (latestRegistration?.waiting) {
            if (hasReloadedForUpdateRef.current) return true;
            updateServiceWorkerRef.current?.(true);
            return true;
          }

          return false;
        };

        const syncRegistration = async () => {
          if (navigator.onLine) {
            await registration.update();
          }

          try {
            await activateWaitingWorker();
          } catch {
            // Best-effort check only.
          }
        };

        updateIntervalId = window.setInterval(() => {
          if (document.visibilityState === 'visible' && navigator.onLine) {
            registration.update();
          }
        }, 15 * 60 * 1000);

        const handleVisible = () => {
          if (document.visibilityState === 'visible') {
            syncRegistration();
          }
        };

        const handleFocus = () => {
          syncRegistration();
        };

        document.addEventListener('visibilitychange', handleVisible);
        window.addEventListener('focus', handleFocus);

        unregisterVisibilitySync = () => {
          document.removeEventListener('visibilitychange', handleVisible);
          window.removeEventListener('focus', handleFocus);
        };

        queueMicrotask(syncRegistration);
      },
    });

    const handleControllerChange = () => {
      if (hasReloadedForUpdateRef.current) return;
      hasReloadedForUpdateRef.current = true;
      markUpdateReload();
      window.location.reload();
    };

    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);

    return () => {
      if (updateIntervalId) {
        window.clearInterval(updateIntervalId);
      }
      unregisterVisibilitySync?.();
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setShowInstallCard(!isStandaloneMode());
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setShowInstallCard(false);
      setInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const reminderEnabled = user?.profile?.transaction_reminder_enabled;

    if (!reminderEnabled || typeof window === 'undefined') {
      return;
    }

    if (!isStandaloneMode() || Notification.permission !== 'granted') {
      return;
    }

    queueMicrotask(async () => {
      try {
        await ensureTransactionReminderSubscription();
      } catch {
        // Silent best-effort sync. User-facing prompt happens from profile settings.
      }
    });
  }, [user?.profile?.transaction_reminder_enabled]);

  const canInstall = useMemo(() => Boolean(installPrompt) && !isInstalled && showInstallCard, [installPrompt, isInstalled, showInstallCard]);

  const installApp = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      setInstalled(true);
    }

    setInstallPrompt(null);
    setShowInstallCard(false);
  };



  if (!canInstall) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 bottom-20 z-[70] flex flex-col items-stretch gap-3 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[360px]">


      {canInstall && (
        <div className="rounded-2xl border border-border-subtle bg-surface-panel p-4 shadow-card">
          <div className="flex items-start gap-3">
            <img src="/logo-pwa.png" alt="" width="40" height="40" loading="lazy" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-text-title">Install WeeBudget</p>
                  <p className="mt-1 text-sm leading-5 text-text-muted">Buka lebih cepat dari home screen, seperti aplikasi native ringan.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInstallCard(false)}
                  className="ui-hover-surface ui-hover-icon rounded-lg p-1 text-text-muted"
                  aria-label="Tutup install prompt"
                >
                  <X size={18} />
                </button>
              </div>
              <Button size="sm" className="mt-4" onClick={installApp}>
                <Download size={16} className="mr-2" />
                Install aplikasi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
