'use client';

import { History } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useTaskActivities } from '@/features/tasks/hooks';
import { formatDateTime } from '@/utils/format';

/** Read-only, oldest-first history. Activity records are never edited from the UI. */
export function ActivityTimeline({ taskId }: { taskId: string }) {
  const activities = useTaskActivities(taskId);

  let body;
  if (activities.isPending) {
    body = (
      <div className="space-y-3" aria-busy="true" aria-label="Loading activity">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  } else if (activities.isError) {
    body = (
      <ErrorState
        message={activities.error.message}
        onRetry={() => activities.refetch()}
        retrying={activities.isFetching}
      />
    );
  } else if (activities.data.length === 0) {
    body = <EmptyState icon={History} title="No activity yet" />;
  } else {
    body = (
      <ol className="relative space-y-5 border-l border-border pl-5">
        {activities.data.map((activity) => (
          <li key={activity.id} className="relative">
            <span
              aria-hidden="true"
              className="absolute -left-[26px] top-1.5 size-2.5 rounded-full bg-primary ring-4 ring-surface"
            />
            <p className="text-sm">{activity.message}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <time dateTime={activity.createdAt}>{formatDateTime(activity.createdAt)}</time>
            </p>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <section aria-labelledby="activity-heading" className="rounded-xl border border-border bg-surface p-6">
      <h2 id="activity-heading" className="mb-4 text-base font-semibold">
        Activity
      </h2>
      {body}
    </section>
  );
}
