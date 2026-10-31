import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { validate } from '../../middlewares/validate.js';
import * as controller from './dashboard.controller.js';
import { dashboardListSchema } from './dashboard.validation.js';

const router = Router();

// Read-only. Every figure is computed from the caller's own role scope on the server.
router.use(authenticate);

router.get('/stats', validate(dashboardListSchema), controller.getStats);
router.get('/activity', validate(dashboardListSchema), controller.getActivity);
router.get('/projects', validate(dashboardListSchema), controller.getProjects);

export default router;
