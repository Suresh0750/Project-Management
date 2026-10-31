'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listActivities, type ListActivitiesParams } from '@/features/activity/api';

export const activityKeys = {
  list: (params: ListActivitiesParams) => ['activities', 'list', params] as const,
};

export function useActivities(params: ListActivitiesParams, enabled = true) {
  return useQuery({
    queryKey: activityKeys.list(params),
    queryFn: ({ signal }) => listActivities(params, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}
