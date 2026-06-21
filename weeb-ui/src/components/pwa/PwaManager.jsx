import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';
import Button from '../ui/Button';

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function PwaManager() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setInstalled] = useState(() => isStandaloneMode());
  const [showInstallCard, setShowInstallCard] = useState(false);
  const updateServiceWorkerRef = useRef(null);

  useEffect(() => {
    let updateIntervalId;

    updateServiceWorkerRef.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        updateServiceWorkerRef.current?.(true);
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;

        updateIntervalId = window.setInterval(() => {
          if (document.visibilityState === 'visible' && navigator.onLine) {
            registration.update();
          }
        }, 15 * 60 * 1000);
      },
    });

    return () => {
      if (updateIntervalId) {
        window.clearInterval(updateIntervalId);
      }
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
            <img src="/logo-pwa.png" alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-text-title">Install WeeBudget</p>
                  <p className="mt-1 text-sm leading-5 text-text-muted">Buka lebih cepat dari home screen, seperti aplikasi native ringan.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInstallCard(false)}
                  className="rounded-lg p-1 text-text-muted transition-colors hover:bg-surface-100 hover:text-text-title"
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
