import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { validate } from '../../middlewares/validate.js';
import { listActivities } from './activity.controller.js';
import { listActivitiesSchema } from './activity.validation.js';

const router = Router();

router.get('/', authenticate, validate(listActivitiesSchema), listActivities);

export default router;
