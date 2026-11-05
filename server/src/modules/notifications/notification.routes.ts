import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { validate } from '../../middlewares/validate.js';
import * as controller from './notification.controller.js';
import { listNotificationsSchema, notificationIdParamSchema } from './notification.validation.js';

const router = Router();

// Every user (any role) manages only their own notifications; the service filters by user id.
router.use(authenticate);

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: List my notifications
 *     description: >-
 *       **Who:** any signed-in user.
 *
 *
 *       Always limited to the caller's own notifications.
 *
 *
 *       Newest first. `meta.unreadCount` is the total number of unread notifications.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/PageQuery"
 *       - name: limit
 *         in: query
 *         description: Items per page (1–50).
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *       - name: unread
 *         in: query
 *         description: "`true` for unread only, `false` for read only."
 *         schema:
 *           type: string
 *           enum:
 *             - "true"
 *             - "false"
 *       - name: type
 *         in: query
 *         description: Only this type.
 *         schema:
 *           $ref: "#/components/schemas/NotificationType"
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/NotificationListOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
router.get('/', validate(listNotificationsSchema), controller.listNotifications);
/**
 * @openapi
 * /api/notifications/unread-count:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: Count my unread notifications
 *     description: |-
 *       **Who:** any signed-in user.
 *
 *       Always limited to the caller's own notifications.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/UnreadCountOk"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
router.get('/unread-count', controller.getUnreadCount);
/**
 * @openapi
 * /api/notifications/read-all:
 *   patch:
 *     tags:
 *       - Notifications
 *     summary: Mark all my notifications as read
 *     description: |-
 *       **Who:** any signed-in user.
 *
 *       Always limited to the caller's own notifications.
 *
 *       The caller's other open tabs are told, so their badge stays in step.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/UpdatedCountOk"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
router.patch('/read-all', controller.markAllRead);
/**
 * @openapi
 * "/api/notifications/{id}/read":
 *   patch:
 *     tags:
 *       - Notifications
 *     summary: Mark one notification as read
 *     description: |-
 *       **Who:** any signed-in user.
 *
 *       Another user's notification is reported as 404.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/NotificationOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "404":
 *         $ref: "#/components/responses/NotFound"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
router.patch('/:id/read', validate(notificationIdParamSchema), controller.markRead);

export default router;
