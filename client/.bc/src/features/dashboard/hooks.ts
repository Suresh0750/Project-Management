'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getDashboardActivity,
  getDashboardProjects,
  getDashboardStats,
} from '@/features/dashboard/api';
import type { ApiError } from '@/lib/api/errors';
import type { ActivityItem } from '@/types/activity';
import type { DashboardStats } from '@/types/dashboard';
import type { Project } from '@/types/project';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: (limit: number) => ['dashboard', 'stats', limit] as const,
  activity: (limit: number) => ['dashboard', 'activity', limit] as const,
  projects: (limit: number) => ['dashboard', 'projects', limit] as const,
};

export function useDashboardStats(limit = 6) {
  return useQuery<DashboardStats, ApiError>({
    queryKey: dashboardKeys.stats(limit),
    queryFn: ({ signal }) => getDashboardStats(limit, signal),
  });
}

export function useDashboardActivity(limit = 6) {
  return useQuery<ActivityItem[], ApiError>({
    queryKey: dashboardKeys.activity(limit),
    queryFn: ({ signal }) => getDashboardActivity(limit, signal),
  });
}

export function useDashboardProjects(limit = 5, enabled = true) {
  return useQuery<Project[], ApiError>({
    queryKey: dashboardKeys.projects(limit),
    queryFn: ({ signal }) => getDashboardProjects(limit, signal),
    enabled,
  });
}
