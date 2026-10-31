import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProjectDetailPage } from '@/components/projects/project-detail-page';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = { title: 'Project · ProjectFlow' };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <ProjectDetailPage role="PROJECT_MANAGER" />
    </Suspense>
  );
}
