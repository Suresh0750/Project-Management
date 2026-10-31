import { success } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { listActivities as listActivitiesService } from './activity.service.js';
import type { ListActivitiesQuery } from './activity.validation.js';

export const listActivities = asyncHandler(async (req, res) => {
  const result = await listActivitiesService(req.user!, req.query as unknown as ListActivitiesQuery);
  res.status(200).json(success(result.activities, 'Activities fetched successfully', result.meta));
});
