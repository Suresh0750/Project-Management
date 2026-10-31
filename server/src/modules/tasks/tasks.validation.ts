import { Priority, TaskStatus } from '@prisma/client';
import { z } from 'zod';

const idSchema = z.string().trim().min(1, 'ID is required').max(64, 'Invalid ID');

const titleSchema = z
  .string()
  .trim()
  .min(1, 'Title is required')
  .max(200, 'Title must be at most 200 characters');

const descriptionSchema = z
  .string()
  .trim()
  .max(5000, 'Description must be at most 5000 characters')
  .nullable()
  .transform((value) => (value === '' ? null : value));

const dueDateSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid due date')
  .transform((value) => new Date(value))
  .nullable();

const prioritySchema = z.nativeEnum(Priority, { message: 'Invalid priority' });
const statusSchema = z.nativeEnum(TaskStatus, { message: 'Invalid status' });

export const DUE_FILTERS = ['overdue', 'today', 'this_week', 'no_due_date'] as const;
export const SORT_FIELDS = ['createdAt', 'dueDate', 'priority', 'position'] as const;

export const listTasksSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100, 'Search must be at most 100 characters').optional(),
    projectId: idSchema.optional(),
    // A user id, "me" (the caller) or "unassigned".
    assigneeId: idSchema.optional(),
    status: statusSchema.optional(),
    priority: prioritySchema.optional(),
    due: z.enum(DUE_FILTERS, { message: 'Invalid due date filter' }).optional(),
    sortBy: z.enum(SORT_FIELDS, { message: 'Invalid sort field' }).default('createdAt'),
    order: z.enum(['asc', 'desc'], { message: 'Order must be asc or desc' }).default('desc'),
  }),
});

export const createTaskSchema = z.object({
  body: z.object({
    title: titleSchema,
    description: descriptionSchema.optional(),
    projectId: idSchema,
    assigneeId: idSchema.nullable().optional(),
    priority: prioritySchema.default('MEDIUM'),
    status: statusSchema.default('TODO'),
    dueDate: dueDateSchema.optional(),
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({ id: idSchema }),
  body: z
    .object({
      title: titleSchema.optional(),
      description: descriptionSchema.optional(),
      priority: prioritySchema.optional(),
      dueDate: dueDateSchema.optional(),
    })
    .refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required' }),
});

export const updateTaskStatusSchema = z.object({
  params: z.object({ id: idSchema }),
  body: z.object({
    status: statusSchema,
    // Place the task directly before this one in the target column; omit to append.
    beforeTaskId: idSchema.nullable().optional(),
  }),
});

export const assignTaskSchema = z.object({
  params: z.object({ id: idSchema }),
  body: z.object({ assigneeId: idSchema.nullable() }),
});

export const taskIdParamSchema = z.object({ params: z.object({ id: idSchema }) });

export const addCommentSchema = z.object({
  params: z.object({ id: idSchema }),
  body: z.object({
    content: z
      .string()
      .trim()
      .min(1, 'Comment cannot be empty')
      .max(2000, 'Comment must be at most 2000 characters'),
  }),
});

export type ListTasksQuery = z.infer<typeof listTasksSchema>['query'];
export type CreateTaskInput = z.infer<typeof createTaskSchema>['body'];
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>['body'];
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>['body'];
