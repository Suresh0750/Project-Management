'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/hooks';
import { ROLE_HOME } from '@/utils/role-routes';


export function GuestOnly({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useSession();

  // A cached user whose latest check failed is a session that ended, not a signed-in user.
  const signedInUser = session.isError ? undefined : session.data;

  useEffect(() => {
    if (signedInUser) router.replace(ROLE_HOME[signedInUser.role]);
  }, [signedInUser, router]);

  if (session.isPending || signedInUser) {
    return (
      <div aria-busy="true" aria-label="Loading">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  return <>{children}</>;
}
