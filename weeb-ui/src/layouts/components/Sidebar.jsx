import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { X, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAdminMenus } from '../../hooks/useAdminMenus';
import DynamicIcon from '../../components/dynamic/DynamicIcon';

function isPathActive(pathname, path) {
  return pathname === path || (path !== '/dashboard' && pathname.startsWith(`${path}/`));
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
        <div 
          className="fixed inset-0 z-40 bg-text-title/35 backdrop-blur-sm md:hidden"
          onClick={close}
        />
      )}
      
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[320px] flex-col border-r border-border-subtle bg-surface-panel/98 shadow-2xl shadow-slate-950/20 transition-transform duration-300 md:relative md:w-72 md:max-w-none md:translate-x-0 md:bg-surface-panel md:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between border-b border-border-subtle px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:h-20 md:px-6 md:py-0">
          <div>
            <img src="/logo-app.png" alt="WeeBudget" width="144" height="48" className="h-11 w-auto object-contain md:h-12" />
          </div>
          <button onClick={close} className="ui-hover-surface ui-hover-icon rounded-2xl p-2.5 text-text-muted md:hidden" aria-label="Tutup menu">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 space-y-3 overflow-y-auto px-4 py-5 md:px-4 md:py-6">
          {menuGroups.map((group) => {
            const isOpenGroup = openGroups[group.key] || activeGroupKeys.includes(group.key);
            const isActiveGroup = activeGroupKeys.includes(group.key);
            const singleItem = group.items.length === 1 ? group.items[0] : null;

            if (singleItem) {
              return (
                <NavLink
                  key={group.key}
                  to={singleItem.path}
                  onClick={close}
                  className={({ isActive }) => cn(
                    "group flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "bg-primary-500/10 text-primary-600 border border-primary-500/20 shadow-sm shadow-primary-500/10"
                      : "ui-hover-surface text-text-muted hover:text-text-title"
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <DynamicIcon
                        name={singleItem.iconName}
                        size={19}
                        className={cn(
                          "shrink-0 transition-colors",
                          isActive ? "text-primary-600" : "text-text-muted group-hover:text-primary-600"
                        )}
                      />
                      <span className="min-w-0 truncate">{singleItem.label}</span>
                    </>
                  )}
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
                    "flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-all duration-200",
                    isActiveGroup
                      ? "bg-surface-100 text-text-title"
                      : "ui-hover-surface text-text-muted hover:text-text-title"
                  )}
                >
                  <DynamicIcon
                    name={group.iconName}
                    size={19}
                    className={cn("shrink-0 transition-colors", isActiveGroup ? "text-primary-600" : "text-text-muted")}
                  />
                  <span className="min-w-0 flex-1 truncate">{group.label}</span>
                  <ChevronDown size={17} className={cn("shrink-0 transition-transform duration-200", isOpenGroup && "rotate-180")} />
                </button>

                {isOpenGroup && (
                  <div className="space-y-1 pl-3">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={close}
                        className={({ isActive }) => cn(
                          "group flex min-h-11 items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-primary-500/10 text-primary-600 border border-primary-500/20 shadow-sm shadow-primary-500/10"
                            : "ui-hover-surface text-text-muted hover:text-text-title"
                        )}
                      >
                        {({ isActive }) => (
                          <>
                            <DynamicIcon
                              name={item.iconName}
                              size={18}
                              className={cn(
                                "shrink-0 transition-colors",
                                isActive ? "text-primary-600" : "text-text-muted group-hover:text-primary-600"
                              )}
                            />
                            <span className="min-w-0 truncate">{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
