import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskDetailPage } from '@/components/tasks/task-detail-page';

export const metadata: Metadata = { title: 'Task · ProjectFlow' };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <TaskDetailPage role="ADMIN" />
    </Suspense>
  );
}
