import { apiClient } from '@/lib/api/client';
import { isPaginationMeta, type ApiSuccess, type Paginated } from '@/lib/api/types';
import type { ActivityAction, ActivityItem } from '@/types/activity';

export interface ListActivitiesParams {
  page: number;
  limit: number;
  search?: string;
  projectId?: string;
  action?: ActivityAction;
  /** A user id or "me". */
  actorId?: string;
  /** Inclusive calendar dates, "YYYY-MM-DD". */
  from?: string;
  to?: string;
}

export async function listActivities(
  params: ListActivitiesParams,
  signal?: AbortSignal,
): Promise<Paginated<ActivityItem>> {
  const { data } = await apiClient.get<ApiSuccess<ActivityItem[]>>('/activities', {
    params: { ...params, search: params.search || undefined },
    signal,
  });
  if (!isPaginationMeta(data.meta)) throw new Error('Unexpected response from the server');
  return { items: data.data, meta: data.meta };
}
