import { Priority, ProjectStatus } from '@prisma/client';
import { z } from 'zod';

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Project name must be at least 2 characters')
  .max(120, 'Project name must be at most 120 characters');

const descriptionSchema = z
  .string()
  .trim()
  .max(5000, 'Description must be at most 5000 characters')
  .nullable()
  .transform((value) => (value === '' ? null : value));

const dateSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date')
  .transform((value) => new Date(value))
  .nullable();

const idSchema = z.string().trim().min(1, 'ID is required').max(64, 'Invalid ID');

const prioritySchema = z.nativeEnum(Priority, { message: 'Invalid priority' });
const statusSchema = z.nativeEnum(ProjectStatus, { message: 'Invalid status' });

interface DateRange {
  startDate?: Date | null | undefined;
  deadline?: Date | null | undefined;
}

export function deadlineBeforeStart({ startDate, deadline }: DateRange): boolean {
  return Boolean(startDate && deadline && deadline.getTime() < startDate.getTime());
}

const DEADLINE_MESSAGE = 'Deadline cannot be earlier than the start date';

export const createProjectSchema = z.object({
  body: z
    .object({
      name: nameSchema,
      description: descriptionSchema.optional(),
      priority: prioritySchema.default('MEDIUM'),
      status: statusSchema.default('PLANNING'),
      startDate: dateSchema.optional(),
      deadline: dateSchema.optional(),
      // Required for ADMIN (who assigns the manager); ignored/forced for PROJECT_MANAGER.
      managerId: idSchema.optional(),
    })
    .superRefine((body, ctx) => {
      if (deadlineBeforeStart(body)) {
        ctx.addIssue({ code: 'custom', path: ['deadline'], message: DEADLINE_MESSAGE });
      }
    }),
});

export const updateProjectSchema = z.object({
  params: z.object({ id: idSchema }),
  body: z
    .object({
      name: nameSchema.optional(),
      description: descriptionSchema.optional(),
      priority: prioritySchema.optional(),
      status: statusSchema.optional(),
      startDate: dateSchema.optional(),
      deadline: dateSchema.optional(),
      managerId: idSchema.optional(),
    })
    .refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required' })
    .superRefine((body, ctx) => {
      if (deadlineBeforeStart(body)) {
        ctx.addIssue({ code: 'custom', path: ['deadline'], message: DEADLINE_MESSAGE });
      }
    }),
});

export const archiveProjectSchema = z.object({
  params: z.object({ id: idSchema }),
  body: z.object({ archived: z.boolean({ message: 'archived must be a boolean' }).default(true) }),
});

export const listProjectsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(12),
    search: z.string().trim().max(100, 'Search must be at most 100 characters').optional(),
    status: statusSchema.optional(),
    priority: prioritySchema.optional(),
    archived: z
      .enum(['true', 'false'], { message: 'archived must be "true" or "false"' })
      .optional()
      .transform((value) => value === 'true'),
  }),
});

export const projectIdParamSchema = z.object({ params: z.object({ id: idSchema }) });

export const addMemberSchema = z.object({
  params: z.object({ id: idSchema }),
  body: z.object({ userId: idSchema }),
});

export const removeMemberSchema = z.object({
  params: z.object({ id: idSchema, userId: idSchema }),
});

export const memberCandidatesSchema = z.object({
  params: z.object({ id: idSchema }),
  query: z.object({
    search: z.string().trim().max(100, 'Search must be at most 100 characters').optional(),
  }),
});

export const projectActivitiesSchema = z.object({
  params: z.object({ id: idSchema }),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>['body'];
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>['body'];
export type ListProjectsQuery = z.infer<typeof listProjectsSchema>['query'];
export type MemberCandidatesQuery = z.infer<typeof memberCandidatesSchema>['query'];
export type ProjectActivitiesQuery = z.infer<typeof projectActivitiesSchema>['query'];
