import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { TasksPage } from '@/components/tasks/tasks-page';

export const metadata: Metadata = { title: 'Tasks · ProjectFlow' };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <TasksPage role="PROJECT_MANAGER" />
    </Suspense>
  );
}
