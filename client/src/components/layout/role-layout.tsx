'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/hooks';
import type { Role } from '@/types/auth';
import { ROLE_HOME } from '@/utils/role-routes';

/**
 * Placeholder shell shown while the session loads. Page content is passed in so the
 * route segment is part of the static shell (required for instant navigation).
 */
export function ShellSkeleton({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1" aria-busy="true" aria-label="Loading">
      <div className="hidden w-64 shrink-0 space-y-3 border-r border-border bg-surface p-4 md:block">
        <Skeleton className="h-8 w-32" />
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
      <main className="flex-1 p-4 sm:p-6">
        {children ?? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * Client-side guard for a role's area: sends signed-out users to /login and
 * users of another role to their own dashboard. The backend remains the real
 * authority on every request.
 */
export function RoleLayout({ role, children }: { role: Role; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const user = session.data;
  const unauthenticated = session.error?.status === 401 || session.error?.status === 403;

  useEffect(() => {
    if (unauthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (user && user.role !== role) {
      router.replace(ROLE_HOME[user.role]);
    }
  }, [unauthenticated, user, role, pathname, router]);

  if (session.isError && !unauthenticated) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col justify-center gap-4 p-6">
        <Alert tone="error">{session.error.message}</Alert>
        <Button onClick={() => session.refetch()}>Try again</Button>
      </div>
    );
  }

  // Still loading: show the page inside the skeleton shell. Signed out or wrong role: no content.
  if (session.isPending) {
    return <ShellSkeleton>{children}</ShellSkeleton>;
  }

  if (!user || user.role !== role) {
    return <ShellSkeleton />;
  }

  return <AppShell user={user}>{children}</AppShell>;
}
