import { Role, type ActivityAction, type Prisma } from '@prisma/client';
import { prisma } from '../../../prisma/client.js';
import type { AuthUser } from '../../types/express.js';
import type { ListActivitiesQuery } from './activity.validation.js';

interface ActivityInput {
  action: ActivityAction;
  message: string;
  actorId: string;
  projectId: string;
  taskId?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Appends an immutable activity record. Always call it with the same transaction client as
 * the change it describes so history can never drift from the data.
 */
export async function recordActivity(
  tx: Prisma.TransactionClient,
  input: ActivityInput,
): Promise<void> {
  await tx.activity.create({
    data: {
      action: input.action,
      message: input.message.slice(0, 500),
      actorId: input.actorId,
      projectId: input.projectId,
      ...(input.taskId !== undefined ? { taskId: input.taskId } : {}),
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    },
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Which activity a user may read: ADMIN everything, PROJECT_MANAGER the projects they manage,
 * MEMBER the projects they belong to. The history is append-only; nothing here writes.
 */
function activityScope(user: AuthUser): Prisma.ActivityWhereInput {
  switch (user.role) {
    case Role.ADMIN:
      return {};
    case Role.PROJECT_MANAGER:
      return { project: { managerId: user.id } };
    case Role.MEMBER:
      return { project: { members: { some: { userId: user.id } } } };
  }
}

export async function listActivities(user: AuthUser, query: ListActivitiesQuery) {
  const and: Prisma.ActivityWhereInput[] = [activityScope(user)];

  if (query.search) and.push({ message: { contains: query.search } });
  if (query.projectId) and.push({ projectId: query.projectId });
  if (query.action) and.push({ action: query.action });
  if (query.actorId) and.push({ actorId: query.actorId === 'me' ? user.id : query.actorId });
  if (query.from || query.to) {
    and.push({
      createdAt: {
        ...(query.from ? { gte: query.from } : {}),
        // Inclusive of the whole end day.
        ...(query.to ? { lt: new Date(query.to.getTime() + DAY_MS) } : {}),
      },
    });
  }

  const where: Prisma.ActivityWhereInput = { AND: and };
  const [rows, total] = await prisma.$transaction([
    prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        action: true,
        message: true,
        createdAt: true,
        actor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true, deletedAt: true } },
      },
    }),
    prisma.activity.count({ where }),
  ]);

  return {
    activities: rows.map(({ task, ...rest }) => ({
      ...rest,
      task: task ? { id: task.id, title: task.title, deleted: task.deletedAt !== null } : null,
    })),
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}
