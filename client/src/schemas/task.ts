import { z } from 'zod';
import { PRIORITIES } from '@/types/project';
import { TASK_STATUSES } from '@/types/task';

const fields = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  description: z.string().trim().max(5000, 'Description must be at most 5000 characters'),
  projectId: z.string(),
  assigneeId: z.string(),
  priority: z.enum(PRIORITIES, { message: 'Select a priority' }),
  status: z.enum(TASK_STATUSES, { message: 'Select a status' }),
  // <input type="date"> value: "YYYY-MM-DD" or "" when empty.
  dueDate: z.string().refine((value) => value === '' || !Number.isNaN(Date.parse(value)), {
    message: 'Enter a valid due date',
  }),
});

export type TaskFormValues = z.infer<typeof fields>;

/** Create needs a project; edit never changes it. Both share one shape so one form serves both. */
export function taskFormSchema(mode: 'create' | 'edit') {
  return fields.superRefine((values, ctx) => {
    if (mode === 'create' && !values.projectId) {
      ctx.addIssue({ code: 'custom', path: ['projectId'], message: 'Select a project' });
    }
  });
}

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment must be at most 2000 characters'),
});

export type CommentValues = z.infer<typeof commentSchema>;
