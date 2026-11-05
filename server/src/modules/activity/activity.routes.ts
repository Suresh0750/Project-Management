import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { validate } from '../../middlewares/validate.js';
import { listActivities } from './activity.controller.js';
import { listActivitiesSchema } from './activity.validation.js';

const router = Router();

/**
 * @openapi
 * /api/activities:
 *   get:
 *     tags:
 *       - Activities
 *     summary: List activity
 *     description: >-
 *       **Who:** any signed-in user.
 *
 *
 *       Newest first. Scoped by role: an administrator sees everything, a Project Manager the projects they manage, a Member the projects they belong to. The history is read-only; nothing here writes.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/PageQuery"
 *       - name: limit
 *         in: query
 *         description: Items per page (1–100).
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - $ref: "#/components/parameters/SearchQuery"
 *       - name: projectId
 *         in: query
 *         description: Only this project.
 *         schema:
 *           type: string
 *           maxLength: 64
 *       - name: action
 *         in: query
 *         description: Only this type of event.
 *         schema:
 *           $ref: "#/components/schemas/ActivityAction"
 *       - name: actorId
 *         in: query
 *         description: A user id, or `me` for the caller's own actions.
 *         schema:
 *           type: string
 *           maxLength: 64
 *       - name: from
 *         in: query
 *         description: From this date (inclusive).
 *         schema:
 *           type: string
 *           format: date
 *       - name: to
 *         in: query
 *         description: Up to this date (inclusive, the whole day). Cannot be before `from`.
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/ActivityListOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
router.get('/', authenticate, validate(listActivitiesSchema), listActivities);

export default router;
