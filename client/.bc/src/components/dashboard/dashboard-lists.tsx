'use client';

import Link from 'next/link';
import { CalendarClock, FolderKanban, History } from 'lucide-react';
import { ActivityList, ActivityListSkeleton } from '@/components/activity/activity-list';
import { DashboardSection } from '@/components/dashboard/dashboard-section';
import { PriorityBadge, ProjectStatusBadge } from '@/components/projects/project-badges';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardActivity, useDashboardProjects } from '@/features/dashboard/hooks';
import { ROLE_BASE_PATH } from '@/lib/auth/navigation';
import type { Role } from '@/types/auth';
import type { DeadlineTask } from '@/types/dashboard';
import { formatCalendarDate } from '@/utils/format';

function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-5" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function RecentActivitySection({ role }: { role: Role }) {
  const base = ROLE_BASE_PATH[role];
  const activity = useDashboardActivity(6);

  let body;
  if (activity.isPending) {
    body = <ActivityListSkeleton rows={4} />;
  } else if (activity.isError) {
    body = (
      <ErrorState
        message={activity.error.message}
        onRetry={() => activity.refetch()}
        retrying={activity.isFetching}
      />
    );
  } else if (activity.data.length === 0) {
    body = (
      <EmptyState
        icon={History}
        title="No activity yet"
        description="Project and task changes will show up here."
      />
    );
  } else {
    body = <ActivityList items={activity.data} basePath={base} />;
  }

  return (
    <DashboardSection
      title="Recent activity"
      action={{ label: 'View all', href: `${base}/activity` }}
      refreshing={activity.isFetching && !activity.isPending}
    >
      {body}
    </DashboardSection>
  );
}

export function RecentProjectsSection({ role }: { role: Role }) {
  const base = ROLE_BASE_PATH[role];
  const projects = useDashboardProjects(5);

  let body;
  if (projects.isPending) {
    body = <RowsSkeleton />;
  } else if (projects.isError) {
    body = (
      <ErrorState
        message={projects.error.message}
        onRetry={() => projects.refetch()}
        retrying={projects.isFetching}
      />
    );
  } else if (projects.data.length === 0) {
    body = (
      <EmptyState
        icon={FolderKanban}
        title="No projects yet"
        description="Recent projects will appear here."
      />
    );
  } else {
    body = (
      <ul className="divide-y divide-border">
        {projects.data.map((project) => (
          <li key={project.id} className="px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <Link
                href={`${base}/projects/${project.id}`}
                className="min-w-0 truncate text-sm font-medium hover:underline"
              >
                {project.name}
              </Link>
              <ProjectStatusBadge status={project.status} />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1">
                <ProgressBar value={project.progress} label={`${project.name} progress`} />
              </div>
              <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                {project.progress}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <DashboardSection
      title="Recent projects"
      action={{ label: 'View all', href: `${base}/projects` }}
      refreshing={projects.isFetching && !projects.isPending}
    >
      {body}
    </DashboardSection>
  );
}

export function UpcomingDeadlinesSection({
  role,
  deadlines,
  loading,
}: {
  role: Role;
  deadlines: DeadlineTask[] | undefined;
  loading: boolean;
}) {
  const base = ROLE_BASE_PATH[role];

  let body;
  if (loading || !deadlines) {
    body = <RowsSkeleton />;
  } else if (deadlines.length === 0) {
    body = (
      <EmptyState
        icon={CalendarClock}
        title="No upcoming deadlines"
        description="Tasks due in the next 30 days will be listed here."
      />
    );
  } else {
    body = (
      <ul className="divide-y divide-border">
        {deadlines.map((task) => (
          <li key={task.id} className="flex items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <Link
                href={`${base}/tasks/${task.id}`}
                className="block truncate text-sm font-medium hover:underline"
              >
                {task.title}
              </Link>
              <p className="truncate text-xs text-muted-foreground">{task.project.name}</p>
            </div>
            <PriorityBadge priority={task.priority} />
            <time dateTime={task.dueDate} className="w-24 text-right text-xs text-muted-foreground">
              {formatCalendarDate(task.dueDate)}
            </time>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <DashboardSection
      title="Upcoming deadlines"
      description="Next 30 days"
      action={{ label: 'All tasks', href: `${base}/tasks` }}
    >
      {body}
    </DashboardSection>
  );
}
