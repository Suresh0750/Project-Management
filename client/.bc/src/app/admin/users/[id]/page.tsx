import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { UserDetailPage } from '@/components/users/user-detail-page';

export const metadata: Metadata = { title: 'User · ProjectFlow' };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <UserDetailPage />
    </Suspense>
  );
}
