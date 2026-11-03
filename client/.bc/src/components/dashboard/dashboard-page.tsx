'use client';

import {
  Activity,
  AlarmClock,
  CircleCheck,
  CirclePlay,
  Clock,
  Eye,
  FolderKanban,
  ListChecks,
  ListTodo,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { BarChartCard, type BarDatum } from '@/components/dashboard/bar-chart-card';
import {
  RecentActivitySection,
  RecentProjectsSection,
  UpcomingDeadlinesSection,
} from '@/components/dashboard/dashboard-lists';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/stat-card';
import { PageHeader } from '@/components/layout/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/hooks';
import { useDashboardStats } from '@/features/dashboard/hooks';
import { ROLE_BASE_PATH } from '@/lib/auth/navigation';
import type { Role } from '@/types/auth';
import type { DashboardCards, DashboardStats } from '@/types/dashboard';
import { TASK_STATUS_LABEL, TASK_STATUSES } from '@/types/task';

interface CardSpec {
  label: string;
  field: keyof DashboardCards;
  icon: LucideIcon;
  alert?: boolean;
  href?: string;
}

/** What each role's headline tiles are, in order. The server only returns fields its role may see. */
function cardSpecs(role: Role, base: string): CardSpec[] {
  switch (role) {
    case 'ADMIN':
      return [
        { label: 'Total users', field: 'totalUsers', icon: Users, href: `${base}/users` },
        { label: 'Total projects', field: 'totalProjects', icon: FolderKanban, href: `${base}/projects` },
        { label: 'Active projects', field: 'activeProjects', icon: Activity, href: `${base}/projects` },
        { label: 'Total tasks', field: 'totalTasks', icon: ListChecks, href: `${base}/tasks` },
        { label: 'Completed tasks', field: 'completedTasks', icon: CircleCheck },
        { label: 'Overdue tasks', field: 'overdueTasks', icon: AlarmClock, alert: true },
      ];
    case 'PROJECT_MANAGER':
      return [
        { label: 'My projects', field: 'myProjects', icon: FolderKanban, href: `${base}/projects` },
        { label: 'Active projects', field: 'activeProjects', icon: Activity, href: `${base}/projects` },
        { label: 'Total tasks', field: 'totalTasks', icon: ListChecks, href: `${base}/tasks` },
        { label: 'Completed tasks', field: 'completedTasks', icon: CircleCheck },
        { label: 'Pending tasks', field: 'pendingTasks', icon: Clock },
        { label: 'Overdue tasks', field: 'overdueTasks', icon: AlarmClock, alert: true },
      ];
    case 'MEMBER':
      return [
        { label: 'Assigned tasks', field: 'assignedTasks', icon: ListChecks, href: `${base}/tasks` },
        { label: 'Overdue tasks', field: 'overdueTasks', icon: AlarmClock, alert: true },
      ];
  }
}

const STATUS_ICON = {
  TODO: ListTodo,
  IN_PROGRESS: CirclePlay,
  IN_REVIEW: Eye,
  COMPLETED: CircleCheck,
} as const;

function statusBars(stats: DashboardStats): BarDatum[] {
  return TASK_STATUSES.map((status) => ({
    id: status,
    label: TASK_STATUS_LABEL[status],
    value: stats.taskStatus[status],
  }));
}

function projectBars(stats: DashboardStats): BarDatum[] {
  return stats.projectCompletion.map((project) => ({
    id: project.id,
    label: project.name,
    value: project.progress,
    detail: `${project.completedTasks} of ${project.totalTasks} tasks completed`,
  }));
}

export function DashboardPage({ role }: { role: Role }) {
  const base = ROLE_BASE_PATH[role];
  const session = useSession();
  const stats = useDashboardStats(6);
  const refreshing = stats.isFetching && !stats.isPending;

  const specs = cardSpecs(role, base);
  const firstName = session.data?.name.split(' ')[0];

  let tiles;
  if (stats.isPending) {
    tiles = Array.from({ length: specs.length + (role === 'MEMBER' ? 4 : 0) }, (_, index) => (
      <StatCardSkeleton key={index} />
    ));
  } else if (stats.isError) {
    tiles = null;
  } else {
    const data = stats.data;
    tiles = specs.map((spec) => (
      <StatCard
        key={spec.field + spec.label}
        label={spec.label}
        value={data.cards[spec.field] ?? 0}
        icon={spec.icon}
        {...(spec.alert ? { alert: true } : {})}
        {...(spec.href ? { href: spec.href } : {})}
      />
    ));
    // A member's headline is their own workload split by status.
    if (role === 'MEMBER') {
      tiles.splice(
        1,
        0,
        ...TASK_STATUSES.map((status) => (
          <StatCard
            key={status}
            label={TASK_STATUS_LABEL[status]}
            value={data.taskStatus[status]}
            icon={STATUS_ICON[status]}
          />
        )),
      );
    }
  }

  const showProjectChart = role !== 'MEMBER';

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
        breadcrumbs={[{ label: base.slice(1) }, { label: 'Dashboard' }]}
      />

      {stats.isError ? (
        <div className="rounded-xl border border-border bg-surface">
          <ErrorState
            message={stats.error.message}
            onRetry={() => stats.refetch()}
            retrying={stats.isFetching}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div
            className={`grid gap-4 sm:grid-cols-2 ${role === 'MEMBER' ? 'xl:grid-cols-3' : 'xl:grid-cols-3 2xl:grid-cols-6'}`}
            aria-busy={stats.isPending}
          >
            {tiles}
          </div>

          <div className={`grid gap-6 ${showProjectChart ? 'lg:grid-cols-2' : ''}`}>
            {stats.isPending ? (
              <>
                <Skeleton className="h-64 w-full" />
                {showProjectChart && <Skeleton className="h-64 w-full" />}
              </>
            ) : (
              <>
                <BarChartCard
                  title={role === 'MEMBER' ? 'My tasks by status' : 'Tasks by status'}
                  description="Where work currently stands"
                  data={statusBars(stats.data)}
                  valueHeader="Tasks"
                  emptyTitle="No tasks yet"
                  emptyDescription="Task counts will appear here once tasks exist."
                  refreshing={refreshing}
                />
                {showProjectChart && (
                  <BarChartCard
                    title="Project completion"
                    description="Share of tasks completed, most recently updated projects"
                    data={projectBars(stats.data)}
                    unit="%"
                    max={100}
                    track
                    valueHeader="Completed"
                    emptyTitle="No projects yet"
                    emptyDescription="Project progress will appear here."
                    refreshing={refreshing}
                  />
                )}
              </>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <RecentActivitySection role={role} />
            {role === 'ADMIN' ? (
              <RecentProjectsSection role={role} />
            ) : (
              <UpcomingDeadlinesSection
                role={role}
                deadlines={stats.data?.upcomingDeadlines}
                loading={stats.isPending}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
