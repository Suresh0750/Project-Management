import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { validate } from '../../middlewares/validate.js';
import * as controller from './dashboard.controller.js';
import { dashboardListSchema } from './dashboard.validation.js';

const router = Router();

// Read-only. Every figure is computed from the caller's own role scope on the server.
router.use(authenticate);

/**
 * @openapi
 * /api/dashboard/stats:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Dashboard figures
 *     description: >-
 *       **Who:** any signed-in user.
 *
 *
 *       Read-only and computed for the caller's role: cards, tasks per status, project completion and upcoming deadlines. A Member's figures cover only their own tasks.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         description: How many upcoming deadlines to return (1–20).
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 6
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/DashboardStatsOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
router.get('/stats', validate(dashboardListSchema), controller.getStats);
/**
 * @openapi
 * /api/dashboard/activity:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Recent activity for the dashboard
 *     description: |-
 *       **Who:** any signed-in user.
 *
 *       The newest activity in the caller's scope.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         description: Items per page (1–20).
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 6
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/DashboardActivityOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
router.get('/activity', validate(dashboardListSchema), controller.getActivity);
/**
 * @openapi
 * /api/dashboard/projects:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Recent projects for the dashboard
 *     description: >-
 *       **Who:** any signed-in user.
 *
 *
 *       The most recent projects in the caller's scope. Archived projects are left out.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         description: Items per page (1–20).
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 6
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/DashboardProjectsOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
router.get('/projects', validate(dashboardListSchema), controller.getProjects);

export default router;
