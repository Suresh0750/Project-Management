import { apiClient } from '@/lib/api/client';
import type { ApiSuccess } from '@/lib/api/types';
import type { ActivityItem } from '@/types/activity';
import type { DashboardStats } from '@/types/dashboard';
import type { Project } from '@/types/project';

export async function getDashboardStats(limit: number, signal?: AbortSignal): Promise<DashboardStats> {
  const { data } = await apiClient.get<ApiSuccess<DashboardStats>>('/dashboard/stats', {
    params: { limit },
    signal,
  });
  return data.data;
}

export async function getDashboardActivity(limit: number, signal?: AbortSignal): Promise<ActivityItem[]> {
  const { data } = await apiClient.get<ApiSuccess<ActivityItem[]>>('/dashboard/activity', {
    params: { limit },
    signal,
  });
  return data.data;
}

export async function getDashboardProjects(limit: number, signal?: AbortSignal): Promise<Project[]> {
  const { data } = await apiClient.get<ApiSuccess<Project[]>>('/dashboard/projects', {
    params: { limit },
    signal,
  });
  return data.data;
}
