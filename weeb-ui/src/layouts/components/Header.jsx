import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut, UserCircle } from 'lucide-react';
import { apiGet, apiPost } from '../../api/http';

export default function Header({ toggleSidebar }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

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
    <header className="h-20 bg-white/90 backdrop-blur-md border-b border-border-subtle px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-2 -ml-2 text-text-muted hover:text-primary-600 rounded-xl hover:bg-surface-100 transition-colors md:hidden"
        >
          <Menu size={24} />
        </button>
        <h2 className="text-xl font-outfit font-medium text-text-title hidden sm:block">
          Selamat datang, Teman WeeB!
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-text-muted hover:text-primary-600 rounded-xl hover:bg-surface-100 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full shadow-glow-primary"></span>
        </button>
        
        <div className="flex items-center gap-3 pl-4 border-l border-border-subtle">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-text-title">{user?.name || 'Mode pribadi'}</p>
            <p className="text-xs text-text-muted">{user?.email || 'Akun aktif'}</p>
          </div>
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="h-9 w-9 rounded-full border border-border-subtle" />
          ) : (
            <UserCircle className="text-primary-500" size={36} strokeWidth={1.5} />
          )}
          <button onClick={logout} className="rounded-xl p-2 text-text-muted transition-colors hover:bg-surface-100 hover:text-danger-base" title="Keluar">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
