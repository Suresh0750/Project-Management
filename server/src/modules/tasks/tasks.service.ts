import { Role, TaskStatus, type Prisma } from '@prisma/client';
import { prisma } from '../../../prisma/client.js';
import { HttpError } from '../../utils/httpError.js';
import type { AuthUser } from '../../types/express.js';
import { recordActivity } from '../activity/activity.service.js';
import { notifyUsers } from '../notifications/notification.service.js';
import { Outbox } from '../../realtime/outbox.js';
import { manages, permissionsFor, taskScope } from './tasks.access.js';
import type {
  CreateTaskInput,
  ListTasksQuery,
  UpdateTaskInput,
  UpdateTaskStatusInput,
} from './tasks.validation.js';

const PERSON_SELECT = { id: true, name: true, email: true } as const;
const DAY_MS = 24 * 60 * 60 * 1000;

const taskInclude = {
  project: { select: { id: true, name: true, archivedAt: true, managerId: true } },
  assignee: { select: PERSON_SELECT },
  creator: { select: PERSON_SELECT },
} satisfies Prisma.TaskInclude;

type TaskRow = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

function fieldError(status: number, path: string, message: string): HttpError {
  return new HttpError(status, message, [{ path, message }]);
}

function toTask(user: AuthUser, row: TaskRow) {
  const { project, ...rest } = row;
  return {
    ...rest,
    project: { id: project.id, name: project.name, archivedAt: project.archivedAt },
    permissions: permissionsFor(user, row),
  };
}

async function findAccessible(user: AuthUser, id: string): Promise<TaskRow> {
  const task = await prisma.task.findFirst({
    where: { id, ...taskScope(user) },
    include: taskInclude,
  });
  if (!task) throw new HttpError(404, 'Task not found');
  return task;
}

function assertWritable(task: TaskRow): void {
  if (task.project.archivedAt) throw new HttpError(400, 'Tasks in an archived project are read-only');
}

/** Project the caller may create tasks in: admins any, managers only their own. */
async function findManageableProject(user: AuthUser, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...(user.role === Role.ADMIN ? {} : { managerId: user.id }) },
    select: { id: true, name: true, managerId: true, archivedAt: true },
  });
  if (!project || !manages(user, project)) {
    throw fieldError(400, 'projectId', 'Select a project you can manage');
  }
  if (project.archivedAt) throw fieldError(400, 'projectId', 'This project is archived');
  return project;
}

/** An assignee must be an active Member of the task's project. */
async function assertValidAssignee(projectId: string, assigneeId: string) {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: assigneeId } },
    select: { user: { select: { id: true, name: true, role: true, isActive: true } } },
  });
  if (!membership || !membership.user.isActive || membership.user.role !== Role.MEMBER) {
    throw fieldError(400, 'assigneeId', 'The assignee must be an active member of the project');
  }
  return membership.user;
}

// ─── List ─────────────────────────────────────────────────────────────────────
function dueWhere(due: NonNullable<ListTasksQuery['due']>): Prisma.TaskWhereInput {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  switch (due) {
    case 'overdue':
      return { dueDate: { lt: today }, status: { not: TaskStatus.COMPLETED } };
    case 'today':
      return { dueDate: { gte: today, lt: new Date(today.getTime() + DAY_MS) } };
    case 'this_week':
      return { dueDate: { gte: today, lt: new Date(today.getTime() + 7 * DAY_MS) } };
    case 'no_due_date':
      return { dueDate: null };
  }
}

function orderBy(query: ListTasksQuery): Prisma.TaskOrderByWithRelationInput[] {
  switch (query.sortBy) {
    case 'position':
      return [{ position: query.order }, { createdAt: 'asc' }];
    case 'priority':
      // MySQL sorts enums by declaration order: LOW < MEDIUM < HIGH < URGENT.
      return [{ priority: query.order }, { createdAt: 'desc' }];
    case 'dueDate':
      return [{ dueDate: query.order }, { createdAt: 'desc' }];
    case 'createdAt':
      return [{ createdAt: query.order }];
  }
}

export async function listTasks(user: AuthUser, query: ListTasksQuery) {
  const and: Prisma.TaskWhereInput[] = [taskScope(user)];

  if (query.search) and.push({ title: { contains: query.search } });
  if (query.projectId) and.push({ projectId: query.projectId });
  if (query.status) and.push({ status: query.status });
  if (query.priority) and.push({ priority: query.priority });
  if (query.due) and.push(dueWhere(query.due));
  if (query.assigneeId) {
    and.push({
      assigneeId:
        query.assigneeId === 'me' ? user.id : query.assigneeId === 'unassigned' ? null : query.assigneeId,
    });
  }

  const where: Prisma.TaskWhereInput = { AND: and };
  const [tasks, total] = await prisma.$transaction([
    prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: orderBy(query),
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.task.count({ where }),
  ]);

  return {
    tasks: tasks.map((task) => toTask(user, task)),
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getTask(user: AuthUser, id: string) {
  return toTask(user, await findAccessible(user, id));
}

// ─── Create ───────────────────────────────────────────────────────────────────
export async function createTask(user: AuthUser, input: CreateTaskInput) {
  const project = await findManageableProject(user, input.projectId);
  const assignee = input.assigneeId ? await assertValidAssignee(project.id, input.assigneeId) : null;
  const outbox = new Outbox();

  const created = await prisma.$transaction(async (tx) => {
    const last = await tx.task.aggregate({
      where: { projectId: project.id, status: input.status, deletedAt: null },
      _max: { position: true },
    });

    const task = await tx.task.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        status: input.status,
        priority: input.priority,
        dueDate: input.dueDate ?? null,
        position: (last._max.position ?? -1) + 1,
        projectId: project.id,
        creatorId: user.id,
        assigneeId: assignee?.id ?? null,
        assignedById: assignee ? user.id : null,
      },
      select: { id: true },
    });

    await recordActivity(tx, {
      action: 'TASK_CREATED',
      message: `${user.name} created task "${input.title}"`,
      actorId: user.id,
      projectId: project.id,
      taskId: task.id,
    });

    if (assignee) {
      await recordActivity(tx, {
        action: 'TASK_ASSIGNED',
        message: `${user.name} assigned "${input.title}" to ${assignee.name}`,
        actorId: user.id,
        projectId: project.id,
        taskId: task.id,
        metadata: { assigneeId: assignee.id },
      });
      outbox.addNotifications(await notifyUsers(tx, [assignee.id], user.id, {
        type: 'TASK_ASSIGNED',
        message: `${user.name} assigned you the task "${input.title}"`,
        projectId: project.id,
        taskId: task.id,
      }));
    }
    return task;
  });

  outbox.addProjectEvent(project.id, 'task:created', { taskId: created.id });
  if (assignee) outbox.addProjectEvent(project.id, 'task:assigned', { taskId: created.id });
  outbox.flush();

  return getTask(user, created.id);
}

// ─── Update (fields) ──────────────────────────────────────────────────────────
export async function updateTask(user: AuthUser, id: string, input: UpdateTaskInput) {
  const task = await findAccessible(user, id);
  const permissions = permissionsFor(user, task);

  if (!permissions.canEdit) {
    assertWritable(task);
    throw new HttpError(403, 'You do not have permission to edit this task');
  }
  // Assignees (members) may only refine the description of their own tasks.
  if (!permissions.canEditAllFields && Object.keys(input).some((key) => key !== 'description')) {
    throw new HttpError(403, 'You can only update the description of tasks assigned to you');
  }

  const data: Prisma.TaskUncheckedUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate;

  const outbox = new Outbox();
  await prisma.$transaction(async (tx) => {
    await tx.task.update({ where: { id }, data });
    await recordActivity(tx, {
      action: 'TASK_UPDATED',
      message: `${user.name} updated task "${input.title ?? task.title}"`,
      actorId: user.id,
      projectId: task.projectId,
      taskId: id,
      metadata: { fields: Object.keys(data) },
    });
  });
  outbox.addProjectEvent(task.projectId, 'task:updated', { taskId: id });
  outbox.flush();

  return getTask(user, id);
}

// ─── Status + ordering ────────────────────────────────────────────────────────
export async function updateTaskStatus(user: AuthUser, id: string, input: UpdateTaskStatusInput) {
  const task = await findAccessible(user, id);
  assertWritable(task);
  if (!permissionsFor(user, task).canChangeStatus) {
    throw new HttpError(403, 'You do not have permission to change this task');
  }

  const outbox = new Outbox();
  await prisma.$transaction(async (tx) => {
    const column = await tx.task.findMany({
      where: { projectId: task.projectId, status: input.status, deletedAt: null, id: { not: id } },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, position: true },
    });

    let index = column.length;
    if (input.beforeTaskId) {
      index = column.findIndex((entry) => entry.id === input.beforeTaskId);
      if (index < 0) {
        throw fieldError(400, 'beforeTaskId', 'The target position is no longer valid');
      }
    }

    // Renumber the whole column so positions stay dense and stable.
    const ordered = [...column.slice(0, index), { id, position: -1 }, ...column.slice(index)];
    for (const [position, entry] of ordered.entries()) {
      if (entry.id === id) {
        await tx.task.update({ where: { id }, data: { status: input.status, position } });
      } else if (entry.position !== position) {
        await tx.task.update({ where: { id: entry.id }, data: { position } });
      }
    }

    if (task.status !== input.status) {
      await recordActivity(tx, {
        action: 'TASK_STATUS_CHANGED',
        message: `${user.name} moved "${task.title}" from ${task.status} to ${input.status}`,
        actorId: user.id,
        projectId: task.projectId,
        taskId: id,
        metadata: { from: task.status, to: input.status },
      });
      outbox.addNotifications(await notifyUsers(tx, [task.assigneeId, task.creatorId], user.id, {
        type: 'TASK_STATUS_CHANGED',
        message: `"${task.title}" moved to ${input.status}`,
        projectId: task.projectId,
        taskId: id,
      }));
    }
  });
  outbox.addProjectEvent(task.projectId, 'task:statusChanged', { taskId: id });
  outbox.flush();

  return getTask(user, id);
}

// ─── Assign ───────────────────────────────────────────────────────────────────
export async function assignTask(user: AuthUser, id: string, assigneeId: string | null) {
  const task = await findAccessible(user, id);
  assertWritable(task);
  if (!permissionsFor(user, task).canAssign) {
    throw new HttpError(403, 'You do not have permission to assign this task');
  }
  if (assigneeId === task.assigneeId) return toTask(user, task);

  const assignee = assigneeId ? await assertValidAssignee(task.projectId, assigneeId) : null;
  const outbox = new Outbox();

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id },
      data: { assigneeId: assignee?.id ?? null, assignedById: assignee ? user.id : null },
    });
    await recordActivity(tx, {
      action: 'TASK_ASSIGNED',
      message: assignee
        ? `${user.name} assigned "${task.title}" to ${assignee.name}`
        : `${user.name} unassigned "${task.title}"`,
      actorId: user.id,
      projectId: task.projectId,
      taskId: id,
      metadata: { assigneeId: assignee?.id ?? null },
    });
    if (assignee) {
      outbox.addNotifications(await notifyUsers(tx, [assignee.id], user.id, {
        type: 'TASK_ASSIGNED',
        message: `${user.name} assigned you the task "${task.title}"`,
        projectId: task.projectId,
        taskId: id,
      }));
    }
  });
  outbox.addProjectEvent(task.projectId, 'task:assigned', { taskId: id });
  outbox.flush();

  return getTask(user, id);
}

// ─── Delete (soft) ────────────────────────────────────────────────────────────
export async function deleteTask(user: AuthUser, id: string): Promise<void> {
  const task = await findAccessible(user, id);
  assertWritable(task);
  if (!permissionsFor(user, task).canDelete) {
    throw new HttpError(403, 'You do not have permission to delete this task');
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.update({ where: { id }, data: { deletedAt: new Date() } });
    await recordActivity(tx, {
      action: 'TASK_DELETED',
      message: `${user.name} deleted task "${task.title}"`,
      actorId: user.id,
      projectId: task.projectId,
      taskId: id,
    });
  });

  const outbox = new Outbox();
  outbox.addProjectEvent(task.projectId, 'task:updated', { taskId: id, deleted: true });
  outbox.flush();
}

// ─── Comments ─────────────────────────────────────────────────────────────────
const commentSelect = {
  id: true,
  content: true,
  createdAt: true,
  author: { select: { id: true, name: true } },
} satisfies Prisma.CommentSelect;

export async function listComments(user: AuthUser, taskId: string) {
  await findAccessible(user, taskId);
  return prisma.comment.findMany({
    where: { taskId },
    orderBy: { createdAt: 'asc' },
    take: 200,
    select: commentSelect,
  });
}

export async function addComment(user: AuthUser, taskId: string, content: string) {
  const task = await findAccessible(user, taskId);
  assertWritable(task);

  const outbox = new Outbox();
  const comment = await prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: { taskId, authorId: user.id, content },
      select: commentSelect,
    });
    await recordActivity(tx, {
      action: 'COMMENT_ADDED',
      message: `${user.name} commented on "${task.title}"`,
      actorId: user.id,
      projectId: task.projectId,
      taskId,
    });
    outbox.addNotifications(await notifyUsers(tx, [task.assigneeId, task.creatorId], user.id, {
      type: 'TASK_COMMENT',
      message: `${user.name} commented on "${task.title}"`,
      projectId: task.projectId,
      taskId,
    }));
    return comment;
  });

  outbox.addProjectEvent(task.projectId, 'task:updated', { taskId });
  outbox.flush();
  return comment;
}

// ─── Activity timeline (chronological, immutable) ─────────────────────────────
export async function listTaskActivities(user: AuthUser, taskId: string) {
  await findAccessible(user, taskId);
  return prisma.activity.findMany({
    where: { taskId },
    orderBy: { createdAt: 'asc' },
    take: 200,
    select: {
      id: true,
      action: true,
      message: true,
      metadata: true,
      createdAt: true,
      actor: { select: { id: true, name: true } },
    },
  });
}
