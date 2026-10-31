import type { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../../../prisma/client.js';
import { HttpError } from '../../utils/httpError.js';
import type { AuthUser } from '../../types/express.js';
import { emitToUser } from '../../realtime/socket.js';
import type { NotificationDto } from '../../realtime/outbox.js';
import type { ListNotificationsQuery } from './notification.validation.js';

const notificationSelect = {
  id: true,
  userId: true,
  type: true,
  message: true,
  readAt: true,
  createdAt: true,
  projectId: true,
  taskId: true,
} satisfies Prisma.NotificationSelect;

interface NotifyInput {
  type: NotificationType;
  message: string;
  projectId: string;
  taskId?: string;
}

/**
 * Creates one notification per recipient, skipping the actor and duplicates. Call it with the
 * transaction client of the change it announces, and publish the returned rows through an
 * Outbox only after that transaction commits.
 */
export async function notifyUsers(
  tx: Prisma.TransactionClient,
  recipientIds: Array<string | null | undefined>,
  actorId: string,
  input: NotifyInput,
): Promise<NotificationDto[]> {
  const unique = [...new Set(recipientIds)].filter(
    (id): id is string => typeof id === 'string' && id !== actorId,
  );

  const created: NotificationDto[] = [];
  for (const userId of unique) {
    created.push(
      await tx.notification.create({
        data: {
          userId,
          type: input.type,
          message: input.message.slice(0, 500),
          projectId: input.projectId,
          ...(input.taskId !== undefined ? { taskId: input.taskId } : {}),
        },
        select: notificationSelect,
      }),
    );
  }
  return created;
}

// ─── Reading (always limited to the caller's own notifications) ───────────────
export async function listNotifications(user: AuthUser, query: ListNotificationsQuery) {
  const where: Prisma.NotificationWhereInput = { userId: user.id };
  if (query.unread !== undefined) where.readAt = query.unread ? null : { not: null };
  if (query.type) where.type = query.type;

  const [rows, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: notificationSelect,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return {
    notifications: rows.map(({ userId: _userId, ...rest }) => rest),
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
      unreadCount,
    },
  };
}

export async function getUnreadCount(user: AuthUser): Promise<number> {
  return prisma.notification.count({ where: { userId: user.id, readAt: null } });
}

// ─── Updating ─────────────────────────────────────────────────────────────────
export async function markRead(user: AuthUser, id: string) {
  // The userId filter makes it impossible to touch someone else's notification.
  await prisma.notification.updateMany({
    where: { id, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  const notification = await prisma.notification.findFirst({
    where: { id, userId: user.id },
    select: notificationSelect,
  });
  if (!notification) throw new HttpError(404, 'Notification not found');

  emitToUser(user.id, 'notification:read', { id });
  const { userId: _userId, ...rest } = notification;
  return rest;
}

export async function markAllRead(user: AuthUser): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  emitToUser(user.id, 'notification:read', { all: true });
  return result.count;
}
