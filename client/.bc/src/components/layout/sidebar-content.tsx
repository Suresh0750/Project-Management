'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { getNavItems, isActivePath, ROLE_LABEL } from '@/lib/auth/navigation';
import type { AuthUser } from '@/types/auth';
import { cn } from '@/utils/cn';

interface SidebarContentProps {
  user: AuthUser;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  onLogout: () => void;
  loggingOut: boolean;
}

export function SidebarContent({
  user,
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  onLogout,
  loggingOut,
}: SidebarContentProps) {
  const pathname = usePathname();
  const items = getNavItems(user.role);
  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-2 border-b border-border px-4',
          collapsed && 'justify-center px-0',
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LayoutDashboard className="size-4" aria-hidden="true" />
        </span>
        {!collapsed && <span className="text-base font-semibold tracking-tight">ProjectFlow</span>}
      </div>

      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {items.map(({ label, href, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? label : undefined}
                  className={cn(
                    'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                    collapsed && 'justify-center px-0',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className={cn(collapsed && 'sr-only')}>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 space-y-2 border-t border-border p-3">
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className={cn(
              'flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-surface-muted hover:text-foreground',
              collapsed && 'justify-center px-0',
            )}
          >
            <CollapseIcon className="size-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span>Collapse</span>}
          </button>
        )}

        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <UserAvatar name={user.name} />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
            </div>
          )}
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            aria-label="Log out"
            title="Log out"
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-danger disabled:opacity-60',
              collapsed && 'hidden',
            )}
          >
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            aria-label="Log out"
            title="Log out"
            className="flex h-9 w-full items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-danger disabled:opacity-60"
          >
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
