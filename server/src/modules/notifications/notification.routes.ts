import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { validate } from '../../middlewares/validate.js';
import * as controller from './notification.controller.js';
import { listNotificationsSchema, notificationIdParamSchema } from './notification.validation.js';

const router = Router();

// Every user (any role) manages only their own notifications; the service filters by user id.
router.use(authenticate);

router.get('/', validate(listNotificationsSchema), controller.listNotifications);
router.get('/unread-count', controller.getUnreadCount);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', validate(notificationIdParamSchema), controller.markRead);

export default router;
