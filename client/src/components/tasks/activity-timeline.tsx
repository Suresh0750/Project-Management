'use client';

import { useMemo } from 'react';
import { History } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { InfiniteScrollBox } from '@/components/ui/infinite-scroll-box';
import { Skeleton } from '@/components/ui/skeleton';
import { flattenFeed, useTaskActivities } from '@/features/tasks/hooks';
import { formatDateTime } from '@/utils/format';

/** Read-only, newest-first history. Activity records are never edited from the UI. */
export function ActivityTimeline({ taskId }: { taskId: string }) {
  const activities = useTaskActivities(taskId);
  const items = useMemo(() => flattenFeed(activities.data?.pages), [activities.data]);

  let body;
  if (activities.isPending) {
    body = (
      <div className="space-y-3" aria-busy="true" aria-label="Loading activity">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  } else if (activities.isError && !activities.data) {
    body = (
      <ErrorState
        message={activities.error.message}
        onRetry={() => activities.refetch()}
        retrying={activities.isFetching}
      />
    );
  } else if (items.length === 0) {
    body = <EmptyState icon={History} title="No activity yet" />;
  } else {
    body = (
      <InfiniteScrollBox
        label="Task activity"
        itemCount={items.length}
        hasNextPage={activities.hasNextPage}
        isFetchingNextPage={activities.isFetchingNextPage}
        isFetchNextPageError={activities.isFetchNextPageError}
        errorMessage={activities.error?.message}
        fetchNextPage={activities.fetchNextPage}
        // Room on the left so the timeline dots are not clipped by the scroll box.
        className="pl-2"
      >
        <ol className="relative space-y-5 border-l border-border pl-5">
          {items.map((activity) => (
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
      </InfiniteScrollBox>
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
