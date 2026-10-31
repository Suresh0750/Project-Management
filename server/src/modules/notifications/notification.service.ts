import type { NotificationType, Prisma } from '@prisma/client';

interface NotifyInput {
  type: NotificationType;
  message: string;
  projectId: string;
  taskId?: string;
}

/**
 * Creates one notification per recipient, skipping the actor and duplicates. Call it with the
 * transaction client of the change it announces.
 */
export async function notifyUsers(
  tx: Prisma.TransactionClient,
  recipientIds: Array<string | null | undefined>,
  actorId: string,
  input: NotifyInput,
): Promise<void> {
  const unique = [...new Set(recipientIds)].filter(
    (id): id is string => typeof id === 'string' && id !== actorId,
  );
  if (unique.length === 0) return;

  await tx.notification.createMany({
    data: unique.map((userId) => ({
      userId,
      type: input.type,
      message: input.message.slice(0, 500),
      projectId: input.projectId,
      ...(input.taskId !== undefined ? { taskId: input.taskId } : {}),
    })),
  });
}
