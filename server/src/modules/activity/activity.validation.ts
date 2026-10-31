import { ActivityAction } from '@prisma/client';
import { z } from 'zod';

const idSchema = z.string().trim().min(1, 'ID is required').max(64, 'Invalid ID');

const dateSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date')
  .transform((value) => new Date(value));

export const listActivitiesSchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      search: z.string().trim().max(100, 'Search must be at most 100 characters').optional(),
      projectId: idSchema.optional(),
      action: z.nativeEnum(ActivityAction, { message: 'Invalid activity type' }).optional(),
      // A user id or "me" (the caller).
      actorId: idSchema.optional(),
      from: dateSchema.optional(),
      to: dateSchema.optional(),
    })
    .superRefine((query, ctx) => {
      if (query.from && query.to && query.to.getTime() < query.from.getTime()) {
        ctx.addIssue({
          code: 'custom',
          path: ['to'],
          message: 'End date cannot be earlier than the start date',
        });
      }
    }),
});

export type ListActivitiesQuery = z.infer<typeof listActivitiesSchema>['query'];
