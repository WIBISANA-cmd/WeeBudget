import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sliders, ArrowUpDown, Lock, Check, Eye, EyeOff, Save, 
  RotateCcw, Sparkles, Database, Layers, ArrowUp, ArrowDown 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import StatusBadge from '../../components/feedback/StatusBadge';
import EmptyState from '../../components/feedback/EmptyState';
import ErrorState from '../../components/feedback/ErrorState';
import LoadingSkeleton from '../../components/feedback/LoadingSkeleton';
import DynamicIcon from '../../components/dynamic/DynamicIcon';
import { fetchAllMenus, saveMenuSettings } from '../../api/dynamicSchema';
import { cn } from '../../lib/utils';

export default function MenuSettingsPage() {
  const navigate = useNavigate();
  const [menus, setMenus] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const loadMenus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchAllMenus();
      setMenus(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat konfigurasi menu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMenus();
  }, []);

  const toggleMenuActive = (index) => {
    setMenus((prev) => {
      const copy = [...prev];
      const item = copy[index];
      if (item.is_locked) return prev; // Cannot toggle locked menu
      copy[index] = { ...item, is_active: !item.is_active };
      return copy;
    });
  };

  const updateMenuOrder = (index, newOrder) => {
    setMenus((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], menu_order: Number(newOrder) };
      return copy;
    });
  };

  const moveMenu = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= menus.length) return;

    setMenus((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;

      // Re-assign sequence numbers
      return copy.map((m, idx) => ({ ...m, menu_order: (idx + 1) * 10 }));
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = menus.map((m) => ({
        menu_key: m.menu_key,
        is_active: Boolean(m.is_active),
        menu_order: Number(m.menu_order),
        icon: m.icon || null,
        custom_label: m.label || null,
      }));

      const updated = await saveMenuSettings(payload);
      setMenus(updated);
      setSuccessMessage('Pengaturan menu berhasil disimpan dan langsung diterapkan.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan pengaturan menu.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-title md:text-3xl">Pengaturan Menu Navigasi</h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Atur urutan, aktifkan atau nonaktifkan menu aplikasi dan entitas dinamis dalam satu tempat.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/admin/data')}>
            <Database size={18} className="mr-2" />
            Skema Dinamis
          </Button>
          <Button onClick={handleSave} isLoading={isSaving}>
            <Save size={18} className="mr-2" />
            Simpan Perubahan
          </Button>
        </div>
      </header>

      {successMessage && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-success-base/30 bg-success-base/10 px-4 py-3 text-sm font-medium text-success-base">
          <Check size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-danger-base/30 bg-danger-base/10 px-4 py-3 text-sm font-medium text-danger-base">
          <ErrorState message={error} />
        </div>
      )}

      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : menus.length === 0 ? (
        <EmptyState title="Tidak ada menu yang terdaftar." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Daftar Menu Navigasi</CardTitle>
            <CardDescription>
              Menu bertanda <Lock size={13} className="inline mx-1 text-primary-600" /> terkunci untuk memastikan Anda selalu memiliki akses ke panel administrasi.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border-subtle">
              {menus.map((menu, index) => {
                const isLocked = Boolean(menu.is_locked);
                const isDynamic = menu.type === 'dynamic';

                return (
                  <div
                    key={menu.menu_key}
                    className={cn(
                      'flex items-center justify-between gap-4 p-4 transition-colors',
                      !menu.is_active && 'opacity-60 bg-surface-100/30'
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-100 text-primary-600">
                        <DynamicIcon name={menu.icon} size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-semibold text-text-title">{menu.label}</span>
                          {isLocked && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary-500/10 px-2 py-0.5 text-[11px] font-semibold text-primary-600">
                              <Lock size={10} /> Inti Terkunci
                            </span>
                          )}
                          {isDynamic && (
                            <span className="rounded-full bg-surface-200 px-2 py-0.5 text-[11px] font-medium text-text-muted">
                              Dinamis
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-text-muted">
                          Grup: <span className="font-medium text-text-body">{menu.group_label || menu.group}</span> • Path: <code className="font-mono">{menu.path}</code>
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {/* Move buttons */}
                      <div className="hidden sm:flex items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveMenu(index, -1)}
                          className="rounded-lg p-1.5 text-text-muted hover:bg-surface-100 disabled:opacity-30"
                          aria-label="Geser ke atas"
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          type="button"
                          disabled={index === menus.length - 1}
                          onClick={() => moveMenu(index, 1)}
                          className="rounded-lg p-1.5 text-text-muted hover:bg-surface-100 disabled:opacity-30"
                          aria-label="Geser ke bawah"
                        >
                          <ArrowDown size={15} />
                        </button>
                      </div>

                      {/* Order Input */}
                      <div className="w-20">
                        <input
                          type="number"
                          value={menu.menu_order}
                          onChange={(e) => updateMenuOrder(index, e.target.value)}
                          className="w-full rounded-xl border border-border-subtle bg-surface-panel px-2.5 py-1.5 text-center text-xs font-mono font-medium text-text-title focus:border-primary-500 focus:outline-none"
                          title="Urutan Tampil"
                        />
                      </div>

                      {/* Toggle Active Button */}
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => toggleMenuActive(index)}
                        aria-pressed={menu.is_active}
                        className={cn(
                          'flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-all',
                          isLocked && 'cursor-not-allowed opacity-50 bg-surface-100 text-text-muted',
                          !isLocked && menu.is_active && 'bg-success-base/15 text-success-base hover:bg-success-base/25',
                          !isLocked && !menu.is_active && 'bg-surface-200 text-text-muted hover:bg-surface-300'
                        )}
                        title={isLocked ? 'Menu inti tidak dapat dinonaktifkan' : 'Klik untuk mengubah status tampil di navigasi'}
                      >
                        {menu.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                        <span>{menu.is_active ? 'Tampil' : 'Sembunyi'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
