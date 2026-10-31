import { NotificationType } from '@prisma/client';
import { z } from 'zod';

export const listNotificationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    unread: z
      .enum(['true', 'false'], { message: 'unread must be "true" or "false"' })
      .optional()
      .transform((value) => (value === undefined ? undefined : value === 'true')),
    type: z.nativeEnum(NotificationType, { message: 'Invalid notification type' }).optional(),
  }),
});

export const notificationIdParamSchema = z.object({
  params: z.object({ id: z.string().trim().min(1, 'ID is required').max(64, 'Invalid ID') }),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsSchema>['query'];
