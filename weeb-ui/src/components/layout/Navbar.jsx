import './Navbar.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  Clock,
  LogOut,
  Menu,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  UserCircle,
  Settings,
  CalendarRange,
  PieChart,
  Users,
} from 'lucide-react';
import { apiPost } from '../../api/http';
import { cn } from '../../lib/utils';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useTimeOfDay } from '../../hooks/useTimeOfDay';

/* ------------------------------------------------------------------ */
/*  Sky image preloader – avoids a blank flash on first period change  */
/* ------------------------------------------------------------------ */
const SKY_PATHS = ['/sky/morning.jpg', '/sky/afternoon.jpg', '/sky/evening.jpg', '/sky/night.jpg'];

let _preloaded = false;
function preloadSkyImages() {
  if (_preloaded) return;
  _preloaded = true;
  SKY_PATHS.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

/* ------------------------------------------------------------------ */
/*  Period → icon mapping                                             */
/* ------------------------------------------------------------------ */
const PERIOD_ICON = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Sunset,
  night: Moon,
};

/* ------------------------------------------------------------------ */
/*  Navbar component                                                  */
/* ------------------------------------------------------------------ */
export default function Navbar({ toggleSidebar }) {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { period, theme, skyImage, greeting } = useTimeOfDay();

  const [isProfileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Current time display
  const [clock, setClock] = useState(() => formatTime(new Date()));

  useEffect(() => {
    const id = setInterval(() => setClock(formatTime(new Date())), 1_000);
    return () => clearInterval(id);
  }, []);

  /* Apply theme class on <html> based on time-of-day */
  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark';
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', isDark ? '#0a0a0a' : '#08a0ff');

    // Night mode body override
    if (isDark) {
      document.body.style.backgroundColor = '#0a0a0a';
    } else {
      document.body.style.backgroundColor = '';
    }
  }, [theme]);

  /* Preload all sky images on mount */
  useEffect(preloadSkyImages, []);

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

  const PeriodIcon = PERIOD_ICON[period];

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

  /* ---------------------------------------------------------------- */
  /* Gradient overlay that ensures text contrast on every sky image    */
  /* ---------------------------------------------------------------- */
  const overlayGradient = useMemo(() => {
    const overlays = {
      morning:
        'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
      afternoon:
        'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.15) 100%)',
      evening:
        'linear-gradient(135deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.25) 100%)',
      night:
        'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 100%)',
    };
    return overlays[period];
  }, [period]);

  return (
    <nav
      id="navbar-dynamic"
      className="navbar-sky-wrapper sticky top-0 z-[100]"
      aria-label="Main navigation"
    >
      {/* ---- Sky background layer (crossfade via CSS opacity) ---- */}
      {SKY_PATHS.map((src) => (
        <div
          key={src}
          className={cn(
            'navbar-sky-bg',
            src === skyImage && 'navbar-sky-bg--active',
          )}
          style={{ backgroundImage: `url(${src})` }}
          aria-hidden="true"
        />
      ))}

      {/* ---- Gradient overlay + glassmorphism ---- */}
      <div
        className="navbar-glass-overlay"
        style={{ background: overlayGradient }}
        aria-hidden="true"
      />

      {/* ---- Content ---- */}
      <div className="navbar-content">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={toggleSidebar}
            className="navbar-icon-btn md:hidden -ml-2"
            aria-label="Toggle sidebar"
          >
            <Menu size={22} />
          </button>

          {/* Greeting + clock */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <PeriodIcon size={20} className="navbar-period-icon" />
              <p className="navbar-greeting">{greeting}</p>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock size={12} className="navbar-clock-icon" />
              <span className="navbar-clock">{clock}</span>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2.5 md:gap-4">
          {/* Period badge */}
          <span className="navbar-period-badge">
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </span>

          {/* Notification bell */}
          <button className="navbar-icon-btn relative" aria-label="Notifications">
            <Bell size={20} />
            <span className="navbar-notif-dot" />
          </button>

          {/* Profile dropdown */}
          <div ref={profileMenuRef} className="relative flex items-center navbar-profile-divider pl-2.5 md:pl-4">
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              className={cn(
                'navbar-profile-btn',
                isProfileOpen && 'navbar-profile-btn--open',
              )}
              aria-haspopup="menu"
              aria-expanded={isProfileOpen}
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="h-10 w-10 rounded-2xl border border-white/30 object-cover"
                />
              ) : (
                <UserCircle className="navbar-avatar-fallback" size={38} strokeWidth={1.5} />
              )}
              <ChevronDown
                size={16}
                className={cn(
                  'hidden md:block navbar-chevron',
                  isProfileOpen && 'rotate-180',
                )}
              />
            </button>

            {isProfileOpen && (
              <div className="navbar-profile-dropdown">
                <div className="rounded-[20px] bg-surface-100 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-600">
                    {greeting}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-title">
                    {user?.name || 'Mode pribadi'}
                  </p>
                  <p className="mt-1 truncate text-xs text-text-muted">
                    {user?.email || 'Akun aktif'}
                  </p>
                </div>
                <div className="mt-2 space-y-1">
                  <button
                    onClick={() => { setProfileOpen(false); navigate('/profile'); }}
                    className="flex min-h-12 w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left text-sm font-medium text-text-body transition-colors hover:bg-surface-100 hover:text-text-title"
                  >
                    <Settings size={18} className="text-text-muted" />
                    Profil
                  </button>
                  <button
                    onClick={() => { setProfileOpen(false); navigate('/periods'); }}
                    className="flex min-h-12 w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left text-sm font-medium text-text-body transition-colors hover:bg-surface-100 hover:text-text-title"
                  >
                    <CalendarRange size={18} className="text-text-muted" />
                    Periode
                  </button>
                  <button
                    onClick={() => { setProfileOpen(false); navigate('/categories'); }}
                    className="flex min-h-12 w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left text-sm font-medium text-text-body transition-colors hover:bg-surface-100 hover:text-text-title"
                  >
                    <PieChart size={18} className="text-text-muted" />
                    Kategori
                  </button>
                  <button
                    onClick={() => { setProfileOpen(false); navigate('/users'); }}
                    className="flex min-h-12 w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left text-sm font-medium text-text-body transition-colors hover:bg-surface-100 hover:text-text-title"
                  >
                    <Users size={18} className="text-text-muted" />
                    User
                  </button>
                </div>
                <div className="mt-2 border-t border-border-subtle pt-2">
                  <button
                    type="button"
                    onClick={logout}
                    className="flex min-h-12 w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left text-sm font-medium text-danger-base transition-colors hover:bg-danger-base/10"
                    role="menuitem"
                  >
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

/* ------------------------------------------------------------------ */
/*  Helper: format time as HH:MM:SS                                    */
/* ------------------------------------------------------------------ */
function formatTime(date) {
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
