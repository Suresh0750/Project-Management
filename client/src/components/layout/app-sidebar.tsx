'use client';

import { SidebarContent } from '@/components/layout/sidebar-content';
import type { AuthUser } from '@/types/auth';
import { cn } from '@/utils/cn';

interface AppSidebarProps {
  user: AuthUser;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
  loggingOut: boolean;
}

export function AppSidebar({
  user,
  collapsed,
  onToggleCollapse,
  onLogout,
  loggingOut,
}: AppSidebarProps) {
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 border-r border-border bg-surface transition-[width] duration-150 md:block',
        collapsed ? 'w-[68px]' : 'w-64',
      )}
    >
      <SidebarContent
        user={user}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        onLogout={onLogout}
        loggingOut={loggingOut}
      />
    </aside>
  );
}
