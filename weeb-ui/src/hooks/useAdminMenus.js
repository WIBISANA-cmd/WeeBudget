import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchAllMenus } from '../api/dynamicSchema';
import { useCurrentUser } from './useCurrentUser';

const defaultFallbackGroups = [
  {
    key: 'main',
    label: 'Utama',
    iconName: 'LayoutDashboard',
    items: [
      { iconName: 'LayoutDashboard', label: 'Dashboard', path: '/dashboard' },
    ],
  },
  {
    key: 'finance',
    label: 'Kelola Keuangan',
    iconName: 'WalletCards',
    items: [
      { iconName: 'ArrowRightLeft', label: 'Transaksi', path: '/transactions' },
      { iconName: 'Landmark', label: 'Rekening', path: '/accounts' },
      { iconName: 'Calculator', label: 'Planner', path: '/budget-planner' },
    ],
  },
  {
    key: 'goals',
    label: 'Tujuan & Proteksi',
    iconName: 'ShieldCheck',
    items: [
      { iconName: 'Target', label: 'Tabungan', path: '/savings' },
      { iconName: 'HeartHandshake', label: 'Tabungan Berdua', path: '/couple-savings' },
      { iconName: 'ShieldAlert', label: 'Dana Darurat', path: '/emergency-fund' },
      { iconName: 'ListChecks', label: 'Wishlist', path: '/wishlist' },
    ],
  },
  {
    key: 'schedule',
    label: 'Jadwal',
    iconName: 'BellRing',
    items: [
      { iconName: 'BellRing', label: 'Tagihan', path: '/bills' },
      { iconName: 'Repeat', label: 'Rutin', path: '/recurring-transactions' },
    ],
  },
  {
    key: 'insights',
    label: 'Analitik',
    iconName: 'ChartNoAxesCombined',
    items: [
      { iconName: 'FileText', label: 'Laporan', path: '/reports' },
      { iconName: 'Lightbulb', label: 'Insight', path: '/insights' },
    ],
  },
];

export function useAdminMenus() {
  const { user } = useCurrentUser();
  const isAdmin = (user?.role || 'user') === 'admin';
  const isPersonalMode = (user?.profile?.account_mode || 'couple') === 'personal';

  const [rawMenus, setRawMenus] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMenus = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setIsLoading(true);
      const data = await fetchAllMenus();
      setRawMenus(data);
    } catch {
      // Fallback silently if offline or token expired
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadMenus();
    }
  }, [isAdmin, loadMenus]);

  useEffect(() => {
    const handleMenuUpdated = () => {
      if (isAdmin) {
        loadMenus();
      }
    };

    window.addEventListener('weeb:menu-updated', handleMenuUpdated);
    return () => window.removeEventListener('weeb:menu-updated', handleMenuUpdated);
  }, [isAdmin, loadMenus]);

  const menuGroups = useMemo(() => {
    if (!isAdmin || rawMenus.length === 0) {
      return defaultFallbackGroups
        .map((g) => ({
          ...g,
          items: g.items.filter((item) => !(isPersonalMode && item.path === '/couple-savings')),
        }))
        .filter((g) => g.items.length > 0);
    }

    // Filter only active menus
    const activeMenus = rawMenus.filter((m) => {
      if (!m.is_active) return false;
      if (isPersonalMode && m.path === '/couple-savings') return false;
      return true;
    });

    const groupMeta = {
      main: { label: 'Utama', iconName: 'LayoutDashboard' },
      finance: { label: 'Kelola Keuangan', iconName: 'WalletCards' },
      goals: { label: 'Tujuan & Proteksi', iconName: 'ShieldCheck' },
      schedule: { label: 'Jadwal', iconName: 'BellRing' },
      insights: { label: 'Analitik', iconName: 'ChartNoAxesCombined' },
      dynamic: { label: 'Data Dinamis', iconName: 'Database' },
      admin: { label: 'Administrator', iconName: 'SlidersHorizontal' },
    };

    const groupedMap = new Map();

    activeMenus.forEach((menu) => {
      const gKey = menu.group || 'dynamic';
      if (!groupedMap.has(gKey)) {
        groupedMap.set(gKey, {
          key: gKey,
          label: menu.group_label || groupMeta[gKey]?.label || 'Lainnya',
          iconName: groupMeta[gKey]?.iconName || 'LayoutGrid',
          items: [],
        });
      }

      groupedMap.get(gKey).items.push({
        menuKey: menu.menu_key,
        label: menu.label,
        path: menu.path,
        iconName: menu.icon,
        isLocked: menu.is_locked,
        type: menu.type,
      });
    });

    return Array.from(groupedMap.values()).filter((g) => g.items.length > 0);
  }, [isAdmin, rawMenus, isPersonalMode]);

  return {
    menuGroups,
    rawMenus,
    isLoading,
    reload: loadMenus,
  };
}
