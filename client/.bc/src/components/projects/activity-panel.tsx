'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import { ActivityList, ActivityListSkeleton } from '@/components/activity/activity-list';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { useProjectActivities } from '@/features/projects/hooks';

export function ActivityPanel({ projectId, active }: { projectId: string; active: boolean }) {
  const [page, setPage] = useState(1);
  const activities = useProjectActivities(projectId, page, active);

  let body;
  if (activities.isPending) {
    body = <ActivityListSkeleton rows={4} />;
  } else if (activities.isError) {
    body = (
      <ErrorState
        message={activities.error.message}
        onRetry={() => activities.refetch()}
        retrying={activities.isFetching}
      />
    );
  } else if (activities.data.items.length === 0) {
    body = (
      <EmptyState
        icon={History}
        title="No activity yet"
        description="Changes to this project will be listed here."
      />
    );
  } else {
    body = <ActivityList items={activities.data.items} />;
  }

  return (
    <div className="rounded-xl border border-border bg-surface">
      {body}
      {activities.data && (
        <Pagination
          meta={activities.data.meta}
          onPageChange={setPage}
          disabled={activities.isFetching}
        />
      )}
    </div>
  );
}
