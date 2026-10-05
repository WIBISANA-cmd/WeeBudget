import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { X, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAdminMenus } from '../../hooks/useAdminMenus';
import DynamicIcon from '../../components/dynamic/DynamicIcon';

function isPathActive(pathname, path) {
  return pathname === path || (path !== '/dashboard' && pathname.startsWith(`${path}/`));
}

const linkClass = ({ isActive }) => cn(
  'group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150',
  isActive
    ? 'bg-primary-soft text-primary-600'
    : 'text-text-muted hover:bg-hover-soft hover:text-text-title',
);

function LinkContent({ item, isActive }) {
  return (
    <>
      <DynamicIcon
        name={item.iconName}
        size={18}
        className={cn('shrink-0 transition-colors', isActive ? 'text-primary-600' : 'text-text-muted group-hover:text-text-title')}
      />
      <span className="min-w-0 truncate">{item.label}</span>
    </>
  );
}

export default function Sidebar({ isOpen, close }) {
  const { pathname } = useLocation();
  const { menuGroups } = useAdminMenus();

  const activeGroupKeys = useMemo(
    () => menuGroups
      .filter((group) => group.items.some((item) => isPathActive(pathname, item.path)))
      .map((group) => group.key),
    [pathname, menuGroups]
  );

  const [openGroups, setOpenGroups] = useState(() => (
    menuGroups.reduce((groups, group) => ({
      ...groups,
      [group.key]: group.items.some((item) => isPathActive(pathname, item.path)),
    }), {})
  ));

  const toggleGroup = (key) => {
    setOpenGroups((groups) => ({ ...groups, [key]: !groups[key] }));
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div className="modal-scrim fixed inset-0 z-40 bg-slate-950/50 md:hidden" onClick={close} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-[300px] flex-col border-r border-border-subtle bg-surface-panel transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:sticky md:top-0 md:h-dvh md:w-60 md:max-w-none md:shrink-0 md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between border-b border-border-subtle px-4 pb-2.5 pt-[calc(env(safe-area-inset-top)+0.625rem)] md:h-14 md:py-0">
          <img src="/logo-app.png" alt="WeeBudget" width="120" height="40" className="h-9 w-auto object-contain" />
          <button onClick={close} className="rounded-xl p-2 text-text-muted transition-colors hover:bg-hover-soft hover:text-text-title md:hidden" aria-label="Tutup menu">
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2.5">
          {menuGroups.map((group) => {
            const isActiveGroup = activeGroupKeys.includes(group.key);
            const isOpenGroup = openGroups[group.key] || isActiveGroup;
            const singleItem = group.items.length === 1 ? group.items[0] : null;

            if (singleItem) {
              return (
                <NavLink key={group.key} to={singleItem.path} onClick={close} className={linkClass}>
                  {({ isActive }) => <LinkContent item={singleItem} isActive={isActive} />}
                </NavLink>
              );
            }

            return (
              <div key={group.key} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={isOpenGroup}
                  className={cn(
                    'flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors duration-150 hover:bg-hover-soft hover:text-text-title',
                    isActiveGroup ? 'text-text-title' : 'text-text-muted',
                  )}
                >
                  <DynamicIcon
                    name={group.iconName}
                    size={18}
                    className={cn('shrink-0', isActiveGroup ? 'text-primary-600' : 'text-text-muted')}
                  />
                  <span className="min-w-0 flex-1 truncate">{group.label}</span>
                  <ChevronDown size={16} className={cn('shrink-0 transition-transform duration-200', isOpenGroup && 'rotate-180')} />
                </button>

                <div className="collapse-panel" data-open={isOpenGroup}>
                  <div className="ml-[21px] space-y-1 border-l border-border-subtle pl-2">
                    {group.items.map((item) => (
                      <NavLink key={item.path} to={item.path} onClick={close} tabIndex={isOpenGroup ? undefined : -1} className={linkClass}>
                        {({ isActive }) => <LinkContent item={item} isActive={isActive} />}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
