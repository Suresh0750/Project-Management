import { z } from 'zod';
import { PRIORITIES, PROJECT_STATUSES } from '@/types/project';
import { todayInputValue } from '@/utils/format';
import { lineString, textString } from '@/lib/text';

const projectFields = z.object({
  name: lineString().pipe(
    z
      .string()
      .min(2, 'Project name must be at least 2 characters')
      .max(120, 'Project name must be at most 120 characters'),
  ),
  description: textString().pipe(z.string().max(5000, 'Description must be at most 5000 characters')),
  priority: z.enum(PRIORITIES, { message: 'Select a priority' }),
  status: z.enum(PROJECT_STATUSES, { message: 'Select a status' }),
  // <input type="date"> values: "YYYY-MM-DD" or "" when empty.
  startDate: z.string(),
  deadline: z.string(),
  managerId: z.string(),
});

export type ProjectFormValues = z.infer<typeof projectFields>;

/**
 * `requireManager` is true for administrators, who must pick the Project Manager.
 * `futureDatesOnly` (create page): the start date and deadline cannot be before today.
 */
export function projectFormSchema(requireManager: boolean, futureDatesOnly = false) {
  return projectFields.superRefine((values, ctx) => {
    if (futureDatesOnly) {
      const today = todayInputValue();
      if (values.startDate && values.startDate < today) {
        ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'Start date cannot be in the past' });
      }
      if (values.deadline && values.deadline < today) {
        ctx.addIssue({ code: 'custom', path: ['deadline'], message: 'Deadline cannot be in the past' });
      }
    }
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
