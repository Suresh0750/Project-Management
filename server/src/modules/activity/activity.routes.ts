import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { validate } from '../../middlewares/validate.js';
import { listActivities } from './activity.controller.js';
import { listActivitiesSchema } from './activity.validation.js';

const router = Router();

// Read-only on purpose: activity records are history and can never be edited or deleted
// through the API. Visibility is scoped by role in the service.
router.get('/', authenticate, validate(listActivitiesSchema), listActivities);

export default router;
