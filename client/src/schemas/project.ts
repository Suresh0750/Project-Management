import { z } from 'zod';
import { PRIORITIES, PROJECT_STATUSES } from '@/types/project';

const projectFields = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Project name must be at least 2 characters')
    .max(120, 'Project name must be at most 120 characters'),
  description: z.string().trim().max(5000, 'Description must be at most 5000 characters'),
  priority: z.enum(PRIORITIES, { message: 'Select a priority' }),
  status: z.enum(PROJECT_STATUSES, { message: 'Select a status' }),
  // <input type="date"> values: "YYYY-MM-DD" or "" when empty.
  startDate: z.string(),
  deadline: z.string(),
  managerId: z.string(),
});

export type ProjectFormValues = z.infer<typeof projectFields>;

/** `requireManager` is true for administrators, who must pick the Project Manager. */
export function projectFormSchema(requireManager: boolean) {
  return projectFields.superRefine((values, ctx) => {
    if (values.startDate && values.deadline && values.deadline < values.startDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['deadline'],
        message: 'Deadline cannot be earlier than the start date',
      });
    }
    if (requireManager && !values.managerId) {
      ctx.addIssue({ code: 'custom', path: ['managerId'], message: 'Select a Project Manager' });
    }
  });
}
