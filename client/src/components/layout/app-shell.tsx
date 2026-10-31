'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, type ReactNode } from 'react';
import { LayoutDashboard, Menu } from 'lucide-react';
import { NotificationDropdown } from '@/components/notifications/notification-dropdown';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';
import { ProfileMenu } from '@/components/layout/profile-menu';
import { useLogout } from '@/features/auth/hooks';
import { useSidebarCollapsed } from '@/hooks/use-sidebar-collapsed';
import { disconnectSocket } from '@/lib/socket/client';
import { useRealtime } from '@/lib/socket/use-realtime';
import type { AuthUser } from '@/types/auth';

export function AppShell({ user, children }: { user: AuthUser; children: ReactNode }) {
  const router = useRouter();
  const logout = useLogout();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Live updates for as long as the user is signed in and this shell is mounted.
  useRealtime();

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const handleLogout = useCallback(() => {
    disconnectSocket();
    logout.mutate(undefined, { onSettled: () => router.replace('/login') });
  }, [logout, router]);

  return (
    <div className="flex min-h-full flex-1">
      <AppSidebar
        user={user}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
        onLogout={handleLogout}
        loggingOut={logout.isPending}
      />
      <MobileSidebar
        user={user}
        open={mobileOpen}
        onClose={closeMobile}
        onLogout={handleLogout}
        loggingOut={logout.isPending}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            className="flex size-9 items-center justify-center rounded-lg text-foreground hover:bg-surface-muted md:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground md:hidden">
            <LayoutDashboard className="size-4" aria-hidden="true" />
          </span>
          <span className="font-semibold tracking-tight md:hidden">ProjectFlow</span>
          <div className="ml-auto flex items-center gap-1">
            <NotificationDropdown role={user.role} />
            <ProfileMenu user={user} onLogout={handleLogout} loggingOut={logout.isPending} />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
