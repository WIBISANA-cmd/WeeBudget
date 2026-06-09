import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Menu, UserCircle } from 'lucide-react';
import { apiGet, apiPost } from '../../api/http';
import { cn } from '../../lib/utils';
import ThemeToggle from '../../components/ui/ThemeToggle';

export default function Header({ toggleSidebar }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat pagi';
    if (hour < 15) return 'Selamat siang';
    if (hour < 19) return 'Selamat sore';
    return 'Selamat malam';
  }, []);

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const response = await apiGet('/auth/me');
        setUser(response.data);
      } catch {
        setUser(null);
      }
    });
  }, []);

  useEffect(() => {
    if (!isProfileOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isProfileOpen]);

  const logout = async () => {
    try {
      await apiPost('/auth/logout');
    } catch {
      // Local token cleanup is enough for the UI even if the server request fails.
    }
    localStorage.removeItem('weeb_auth_token');
    setUser(null);
    setProfileOpen(false);
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface-panel/92 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-xl transition-colors duration-200 sm:px-5 md:px-8 md:py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button 
            onClick={toggleSidebar}
            className="-ml-2 rounded-2xl p-3 text-text-muted transition-colors hover:bg-surface-100 hover:text-primary-600 md:hidden"
          >
            <Menu size={22} />
          </button>
          <div className="min-w-0">
            <p className="text-[25px] font-semibold uppercase tracking-[0.18em] text-primary-600">{greeting}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 md:gap-4">
          <ThemeToggle />
          <button className="relative rounded-2xl p-3 text-text-muted transition-colors hover:bg-surface-100 hover:text-primary-600">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full shadow-glow-primary"></span>
          </button>
        
          <div ref={profileMenuRef} className="relative flex items-center border-l border-border-subtle pl-2.5 md:pl-4">
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              className={cn(
                'flex items-center gap-2 rounded-2xl px-1.5 py-1.5 transition-colors hover:bg-surface-100',
                isProfileOpen && 'bg-surface-100'
              )}
              aria-haspopup="menu"
              aria-expanded={isProfileOpen}
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="h-10 w-10 rounded-2xl border border-border-subtle object-cover" />
              ) : (
                <UserCircle className="text-primary-500" size={38} strokeWidth={1.5} />
              )}
              <ChevronDown size={16} className={cn('hidden text-text-muted transition-transform md:block', isProfileOpen && 'rotate-180')} />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-72 rounded-[24px] border border-border-subtle bg-surface-panel p-2 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)]">
                <div className="rounded-[20px] bg-surface-100 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-600">{greeting}</p>
                  <p className="mt-1 text-sm font-semibold text-text-title">{user?.name || 'Mode pribadi'}</p>
                  <p className="mt-1 truncate text-xs text-text-muted">{user?.email || 'Akun aktif'}</p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="mt-2 flex min-h-12 w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left text-sm font-medium text-danger-base transition-colors hover:bg-danger-base/10"
                  role="menuitem"
                >
                  <LogOut size={18} />
                  Keluar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
