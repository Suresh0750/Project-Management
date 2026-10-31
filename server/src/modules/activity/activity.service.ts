import type { ActivityAction, Prisma } from '@prisma/client';

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
