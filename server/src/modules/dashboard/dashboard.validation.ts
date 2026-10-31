import { z } from 'zod';

export const dashboardListSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(20).default(6),
  }),
});

export type DashboardListQuery = z.infer<typeof dashboardListSchema>['query'];
