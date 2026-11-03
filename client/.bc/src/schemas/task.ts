import { z } from 'zod';
import { PRIORITIES } from '@/types/project';
import { TASK_STATUSES } from '@/types/task';
import { todayInputValue } from '@/utils/format';
import { lineString, textString } from '@/lib/text';

const fields = z.object({
  title: lineString().pipe(
    z.string().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
  ),
  description: textString().pipe(z.string().max(5000, 'Description must be at most 5000 characters')),
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
export function taskFormSchema(mode: 'create' | 'edit', originalDueDate = '') {
  return fields.superRefine((values, ctx) => {
    // A due date cannot be in the past. While editing, keeping the saved date is still fine.
    if (values.dueDate && values.dueDate < todayInputValue() && values.dueDate !== originalDueDate) {
      ctx.addIssue({ code: 'custom', path: ['dueDate'], message: 'Due date cannot be in the past' });
    }
    if (mode === 'create' && !values.projectId) {
      ctx.addIssue({ code: 'custom', path: ['projectId'], message: 'Select a project' });
    }
  });
}

export const commentSchema = z.object({
  content: textString().pipe(
    z
      .string()
      .min(1, 'Comment cannot be empty')
      .max(2000, 'Comment must be at most 2000 characters'),
  ),
});

export type CommentValues = z.infer<typeof commentSchema>;
