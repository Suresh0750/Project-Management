'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listActivities, type ListActivitiesParams } from '@/features/activity/api';

export const activityKeys = {
  list: (params: ListActivitiesParams) => ['activities', 'list', params] as const,
};

/** One page of the newest-first activity history; the previous page stays on screen while the next loads. */
export function useActivities(params: ListActivitiesParams, enabled = true) {
  return useQuery({
    queryKey: activityKeys.list(params),
    queryFn: ({ signal }) => listActivities(params, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}
