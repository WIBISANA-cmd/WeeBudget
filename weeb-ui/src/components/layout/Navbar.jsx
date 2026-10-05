import './Navbar.css';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  CalendarRange,
  PieChart,
  Users,
  Database,
  PanelsTopLeft,
} from 'lucide-react';
import { apiPost } from '../../api/http';
import { cn } from '../../lib/utils';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useTimeOfDay } from '../../hooks/useTimeOfDay';
import ThemeToggle from '../ui/ThemeToggle';
import UserAvatar from '../ui/UserAvatar';

const menuItems = [
  { label: 'Profil', path: '/profile', icon: Settings },
  { label: 'Periode', path: '/periods', icon: CalendarRange },
  { label: 'Kategori', path: '/categories', icon: PieChart },
];

const adminMenuItems = [
  { label: 'Kelola User', path: '/users', icon: Users },
  { label: 'Skema Dinamis', path: '/admin/data', icon: Database },
  { label: 'Pengaturan Menu', path: '/admin/menu', icon: PanelsTopLeft },
];

export default function Navbar({ toggleSidebar }) {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { greeting } = useTimeOfDay();

  const [isProfileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef(null);

  /* Profile dropdown outside-click / escape */
  useEffect(() => {
    if (!isProfileOpen) return undefined;
    const handlePointerDown = (e) => {
      if (!profileMenuRef.current?.contains(e.target)) setProfileOpen(false);
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setProfileOpen(false);
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
    setProfileOpen(false);
    navigate('/login');
  };

  const goTo = (path) => {
    setProfileOpen(false);
    navigate(path);
  };

  const items = user?.role === 'admin' ? [...menuItems, ...adminMenuItems] : menuItems;

  return (
    <nav id="navbar-dynamic" className="navbar-bar sticky top-0 z-[100]" aria-label="Main navigation">
      <div className="navbar-content">
        <div className="flex min-w-0 items-center gap-2">
          <button onClick={toggleSidebar} className="navbar-icon-btn -ml-1 md:hidden" aria-label="Buka menu">
            <Menu size={22} />
          </button>

          <div className="min-w-0">
            <p className="navbar-greeting">{greeting}</p>
            <p className="navbar-name truncate">{user?.name || 'WeeBudget'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <div ref={profileMenuRef} className="relative flex items-center">
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              className={cn('navbar-profile-btn', isProfileOpen && 'navbar-profile-btn--open')}
              aria-haspopup="menu"
              aria-expanded={isProfileOpen}
              aria-label="Menu akun"
            >
              <UserAvatar
                src={user?.avatar_url}
                alt={user?.name || 'User avatar'}
                size={36}
                priority
                imageClassName="rounded-xl border border-border-subtle"
                fallbackClassName="bg-transparent"
                className="h-9 w-9"
              />
              <ChevronDown size={16} className={cn('navbar-chevron hidden md:block', isProfileOpen && 'rotate-180')} />
            </button>

            {isProfileOpen && (
              <div className="navbar-profile-dropdown" role="menu">
                <div className="rounded-xl bg-surface-100 px-3 py-2.5">
                  <p className="truncate text-sm font-semibold text-text-title">{user?.name || 'Akun'}</p>
                  {user?.email && <p className="mt-0.5 truncate text-xs text-text-muted">{user.email}</p>}
                </div>
                <div className="mt-1.5 space-y-0.5">
                  {items.map((item) => (
                    <button key={item.path} type="button" role="menuitem" onClick={() => goTo(item.path)} className="navbar-menu-item">
                      <item.icon size={18} className="text-text-muted" />
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 border-t border-border-subtle pt-1.5">
                  <button type="button" role="menuitem" onClick={logout} className="navbar-menu-item navbar-menu-item--danger">
                    <LogOut size={18} />
                    Keluar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
