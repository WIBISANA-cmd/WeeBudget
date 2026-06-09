import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, UserCircle } from 'lucide-react';
import { apiGet, apiPost } from '../../api/http';
import ThemeToggle from '../../components/ui/ThemeToggle';

export default function Header({ toggleSidebar }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
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

  const logout = async () => {
    try {
      await apiPost('/auth/logout');
    } catch {
      // Local token cleanup is enough for the UI even if the server request fails.
    }
    localStorage.removeItem('weeb_auth_token');
    setUser(null);
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
          <div className="min-w-0 md:hidden">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-600">{greeting}</p>
            <p className="truncate text-base font-semibold text-text-title">{user?.name || 'WeeBudget'}</p>
          </div>
        </div>

      <div className="flex items-center gap-2.5 md:gap-4">
        <ThemeToggle />
        <button className="relative rounded-2xl p-3 text-text-muted transition-colors hover:bg-surface-100 hover:text-primary-600">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full shadow-glow-primary"></span>
        </button>
        
        <div className="flex items-center gap-2 border-l border-border-subtle pl-2.5 md:gap-3 md:pl-4">
          <div className="hidden text-right md:block">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">{greeting}</p>
            <p className="text-sm font-medium text-text-title">{user?.name || 'Mode pribadi'}</p>
            <p className="text-xs text-text-muted">{user?.email || 'Akun aktif'}</p>
          </div>
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="h-10 w-10 rounded-2xl border border-border-subtle object-cover" />
          ) : (
            <UserCircle className="text-primary-500" size={38} strokeWidth={1.5} />
          )}
          <button onClick={logout} className="rounded-2xl p-3 text-text-muted transition-colors hover:bg-surface-100 hover:text-danger-base" title="Keluar">
            <LogOut size={18} />
          </button>
        </div>
      </div>
      </div>
    </header>
  );
}
