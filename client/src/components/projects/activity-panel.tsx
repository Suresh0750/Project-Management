'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectActivities } from '@/features/projects/hooks';
import { formatDateTime } from '@/utils/format';

export function ActivityPanel({ projectId, active }: { projectId: string; active: boolean }) {
  const [page, setPage] = useState(1);
  const activities = useProjectActivities(projectId, page, active);

  if (activities.isPending) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-surface p-5" aria-busy="true">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (activities.isError) {
    return (
      <div className="rounded-xl border border-border bg-surface">
        <ErrorState
          message={activities.error.message}
          onRetry={() => activities.refetch()}
          retrying={activities.isFetching}
        />
      </div>
    );
  }

  const { items, meta } = activities.data;

  return (
    <div className="rounded-xl border border-border bg-surface">
      {items.length === 0 ? (
        <EmptyState
          icon={History}
          title="No activity yet"
          description="Changes to this project will be listed here."
        />
      ) : (
        <ol className="divide-y divide-border">
          {items.map((activity) => (
            <li key={activity.id} className="px-5 py-3">
              <p className="text-sm">{activity.message}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <time dateTime={activity.createdAt}>{formatDateTime(activity.createdAt)}</time>
              </p>
            </li>
          ))}
        </ol>
      )}
      <Pagination meta={meta} onPageChange={setPage} disabled={activities.isFetching} />
    </div>
  );
}
