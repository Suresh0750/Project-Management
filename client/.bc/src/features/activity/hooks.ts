'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { listActivities, type ListActivitiesParams } from '@/features/activity/api';

export type ActivityFeedParams = Omit<ListActivitiesParams, 'page'>;

export const activityKeys = {
  feed: (params: ActivityFeedParams) => ['activities', 'feed', params] as const,
};

/** Newest-first feed that loads one page at a time as the reader scrolls. */
export function useActivityFeed(params: ActivityFeedParams, enabled = true) {
  return useInfiniteQuery({
    queryKey: activityKeys.feed(params),
    queryFn: ({ pageParam, signal }) => listActivities({ ...params, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
    enabled,
  });
}
