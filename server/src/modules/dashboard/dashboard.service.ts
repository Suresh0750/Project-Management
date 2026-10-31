import { Role, TaskStatus, type Prisma } from '@prisma/client';
import { prisma } from '../../../prisma/client.js';
import type { AuthUser } from '../../types/express.js';
import { listActivities } from '../activity/activity.service.js';
import { listProjects } from '../projects/projects.service.js';
import { taskScope } from '../tasks/tasks.access.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const UPCOMING_WINDOW_DAYS = 30;
const CHART_PROJECTS = 8;

const emptyStatusCounts = (): Record<TaskStatus, number> => ({
  TODO: 0,
  IN_PROGRESS: 0,
  IN_REVIEW: 0,
  COMPLETED: 0,
});

function utcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Projects the user may see on the dashboard. Archived ones are history, not "current". */
function projectScope(user: AuthUser): Prisma.ProjectWhereInput {
  switch (user.role) {
    case Role.ADMIN:
      return { archivedAt: null };
    case Role.PROJECT_MANAGER:
      return { archivedAt: null, managerId: user.id };
    case Role.MEMBER:
      return { archivedAt: null, members: { some: { userId: user.id } } };
  }
}

/**
 * Tasks the dashboard counts. Admin/manager: everything they can see. Member: only the tasks
 * assigned to them, because their dashboard is about their own workload.
 */
function dashboardTaskWhere(user: AuthUser): Prisma.TaskWhereInput {
  // Tasks of archived projects are excluded so task and project figures always agree.
  const current: Prisma.TaskWhereInput = {
    AND: [taskScope(user), { project: { archivedAt: null } }],
  };
  return user.role === Role.MEMBER ? { AND: [current, { assigneeId: user.id }] } : current;
}

async function statusCounts(where: Prisma.TaskWhereInput) {
  const groups = await prisma.task.groupBy({ by: ['status'], where, _count: { _all: true } });
  const counts = emptyStatusCounts();
  for (const group of groups) counts[group.status] = group._count._all;
  return counts;
}

async function projectCompletion(user: AuthUser) {
  const projects = await prisma.project.findMany({
    where: projectScope(user),
    orderBy: { updatedAt: 'desc' },
    take: CHART_PROJECTS,
    select: { id: true, name: true },
  });
  if (projects.length === 0) return [];

  const ids = projects.map((project) => project.id);
  const [totals, done] = await Promise.all([
    prisma.task.groupBy({
      by: ['projectId'],
      where: { projectId: { in: ids }, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ['projectId'],
      where: { projectId: { in: ids }, deletedAt: null, status: TaskStatus.COMPLETED },
      _count: { _all: true },
    }),
  ]);
  const totalBy = new Map(totals.map((row) => [row.projectId, row._count._all]));
  const doneBy = new Map(done.map((row) => [row.projectId, row._count._all]));

  return projects.map((project) => {
    const total = totalBy.get(project.id) ?? 0;
    const completed = doneBy.get(project.id) ?? 0;
    return {
      id: project.id,
      name: project.name,
      totalTasks: total,
      completedTasks: completed,
      progress: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  });
}

async function upcomingDeadlines(user: AuthUser, today: Date, limit: number) {
  return prisma.task.findMany({
    where: {
      ...dashboardTaskWhere(user),
      status: { not: TaskStatus.COMPLETED },
      dueDate: { gte: today, lt: new Date(today.getTime() + UPCOMING_WINDOW_DAYS * DAY_MS) },
    },
    orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
    take: limit,
    select: {
      id: true,
      title: true,
      dueDate: true,
      priority: true,
      status: true,
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
  });
}

export async function getStats(user: AuthUser, limit: number) {
  const today = utcToday();
  const taskWhere = dashboardTaskWhere(user);

  const [byStatus, overdue] = await Promise.all([
    statusCounts(taskWhere),
    prisma.task.count({
      where: { ...taskWhere, dueDate: { lt: today }, status: { not: TaskStatus.COMPLETED } },
    }),
  ]);

  const totalTasks = Object.values(byStatus).reduce((sum, count) => sum + count, 0);
  const completedTasks = byStatus.COMPLETED;
  const common = {
    totalTasks,
    completedTasks,
    pendingTasks: totalTasks - completedTasks,
    overdueTasks: overdue,
  };

  switch (user.role) {
    case Role.ADMIN: {
      const [totalUsers, totalProjects, activeProjects, completion] = await Promise.all([
        prisma.user.count(),
        prisma.project.count({ where: projectScope(user) }),
        prisma.project.count({ where: { ...projectScope(user), status: 'ACTIVE' } }),
        projectCompletion(user),
      ]);
      return {
        role: user.role,
        cards: { totalUsers, totalProjects, activeProjects, ...common },
        taskStatus: byStatus,
        projectCompletion: completion,
        upcomingDeadlines: [],
      };
    }
    case Role.PROJECT_MANAGER: {
      const [myProjects, activeProjects, completion, deadlines] = await Promise.all([
        prisma.project.count({ where: projectScope(user) }),
        prisma.project.count({ where: { ...projectScope(user), status: 'ACTIVE' } }),
        projectCompletion(user),
        upcomingDeadlines(user, today, limit),
      ]);
      return {
        role: user.role,
        cards: { myProjects, activeProjects, ...common },
        taskStatus: byStatus,
        projectCompletion: completion,
        upcomingDeadlines: deadlines,
      };
    }
    case Role.MEMBER: {
      const deadlines = await upcomingDeadlines(user, today, limit);
      return {
        role: user.role,
        cards: { assignedTasks: totalTasks, ...common },
        taskStatus: byStatus,
        projectCompletion: [],
        upcomingDeadlines: deadlines,
      };
    }
  }
}

export async function getRecentActivity(user: AuthUser, limit: number) {
  const result = await listActivities(user, { page: 1, limit });
  return result.activities;
}

export async function getRecentProjects(user: AuthUser, limit: number) {
  const result = await listProjects(user, { page: 1, limit, archived: false });
  return result.projects;
}
