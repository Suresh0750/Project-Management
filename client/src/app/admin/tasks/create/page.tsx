import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateTaskPage } from '@/components/tasks/create-task-page';

export const metadata: Metadata = { title: 'New task · ProjectFlow' };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <CreateTaskPage role="ADMIN" />
    </Suspense>
  );
}
