import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import * as controller from './tasks.controller.js';
import {
  addCommentSchema,
  assignTaskSchema,
  createTaskSchema,
  listTasksSchema,
  taskFeedSchema,
  taskIdParamSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from './tasks.validation.js';

const router = Router();

// Every route needs a valid session. Per-task access and permissions live in the service.
router.use(authenticate);

const manage = authorize(Role.ADMIN, Role.PROJECT_MANAGER);

/**
 * @openapi
 * /api/tasks:
 *   get:
 *     tags:
 *       - Tasks
 *     summary: List tasks
 *     description: >-
 *       **Who:** any signed-in user.
 *
 *
 *       Only tasks in projects the caller may see (administrator: all; Project Manager: projects they manage; Member: projects they belong to). Deleted tasks never appear. Filters are added on top of that scope and can only narrow it.
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
 *           default: 10
 *       - $ref: "#/components/parameters/SearchQuery"
 *       - name: projectId
 *         in: query
 *         description: Only tasks of this project.
 *         schema:
 *           type: string
 *           maxLength: 64
 *       - name: assigneeId
 *         in: query
 *         description: A user id, `me` (the caller) or `unassigned`.
 *         schema:
 *           type: string
 *           maxLength: 64
 *       - name: status
 *         in: query
 *         description: Only tasks with this status.
 *         schema:
 *           $ref: "#/components/schemas/TaskStatus"
 *       - name: priority
 *         in: query
 *         description: Only tasks with this priority.
 *         schema:
 *           $ref: "#/components/schemas/Priority"
 *       - name: due
 *         in: query
 *         description: Due-date filter.
 *         schema:
 *           type: string
 *           enum:
 *             - overdue
 *             - today
 *             - this_week
 *             - no_due_date
 *       - name: sortBy
 *         in: query
 *         description: Sort field.
 *         schema:
 *           type: string
 *           enum:
 *             - createdAt
 *             - dueDate
 *             - priority
 *             - position
 *           default: createdAt
 *       - name: order
 *         in: query
 *         description: Sort direction.
 *         schema:
 *           type: string
 *           enum:
 *             - asc
 *             - desc
 *           default: desc
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/TaskListOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
router.get('/', validate(listTasksSchema), controller.listTasks);
/**
 * @openapi
 * /api/tasks:
 *   post:
 *     tags:
 *       - Tasks
 *     summary: Create a task
 *     description: >-
 *       **Who:** administrators, and Project Managers for the projects they
 *       manage.
 *
 *
 *       The project must be one the caller manages and must not be archived. An assignee must be an active member of the project, and is notified. The due date cannot be in the past (400). A new task that is not completed makes a Completed project Active again.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CreateTaskRequest"
 *           example:
 *             title: Design the login page
 *             description: Include error states
 *             projectId: cmhx2k1ab0000abcd1234efgh
 *             assigneeId: null
 *             priority: MEDIUM
 *             status: TODO
 *             dueDate: 2026-11-20
 *     responses:
 *       "201":
 *         $ref: "#/components/responses/TaskCreatedOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
router.post('/', manage, validate(createTaskSchema), controller.createTask);

/**
 * @openapi
 * "/api/tasks/{id}":
 *   get:
 *     tags:
 *       - Tasks
 *     summary: Get a task
 *     description: >-
 *       **Who:** any signed-in user.
 *
 *
 *       Includes `permissions`: what the caller may do with this task. A task the caller cannot see is reported as 404.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/TaskOk"
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
router.get('/:id', validate(taskIdParamSchema), controller.getTask);
/**
 * @openapi
 * "/api/tasks/{id}":
 *   patch:
 *     tags:
 *       - Tasks
 *     summary: Edit a task
 *     description: >-
 *       **Who:** administrators, and Project Managers for the projects they
 *       manage.
 *
 *
 *       Edits the title, description, priority or due date. **Members cannot edit a task** (403), not even their own; they can only change its status. Tasks of archived projects are read-only (400). A due date cannot be moved to the past (an existing past date can stay).
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UpdateTaskRequest"
 *           example:
 *             title: Design the sign-in page
 *             priority: HIGH
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/TaskOk"
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
// Only administrators and the project's manager may edit a task; the service decides.
router.patch('/:id', validate(updateTaskSchema), controller.updateTask);
/**
 * @openapi
 * "/api/tasks/{id}/status":
 *   patch:
 *     tags:
 *       - Tasks
 *     summary: Change a task's status (and position)
 *     description: >-
 *       **Who:** administrators, the project's Project Manager, and the Member the
 *       task is assigned to.
 *
 *
 *       Moves the task to a status column, optionally before another task (`beforeTaskId`). The assignee and creator are notified. **The project follows its tasks:** when the last open task is completed a Planning or Active project becomes Completed; when a task of a Completed project is reopened the project becomes Active again (On Hold projects are left alone).
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UpdateTaskStatusRequest"
 *           example:
 *             status: IN_PROGRESS
 *             beforeTaskId: null
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/TaskOk"
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
router.patch('/:id/status', validate(updateTaskStatusSchema), controller.updateTaskStatus);
/**
 * @openapi
 * "/api/tasks/{id}/assign":
 *   patch:
 *     tags:
 *       - Tasks
 *     summary: Assign, reassign or unassign a task
 *     description: >-
 *       **Who:** administrators, and Project Managers for the projects they
 *       manage.
 *
 *
 *       `assigneeId: null` unassigns. The assignee must be an active member of the project (400 otherwise). The new assignee is told they were assigned, and the previous one that the task is no longer theirs.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/AssignTaskRequest"
 *           example:
 *             assigneeId: cmhx2k1ab0000abcd1234efgh
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/TaskOk"
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
router.patch('/:id/assign', manage, validate(assignTaskSchema), controller.assignTask);
/**
 * @openapi
 * "/api/tasks/{id}":
 *   delete:
 *     tags:
 *       - Tasks
 *     summary: Delete a task
 *     description: >-
 *       **Who:** administrators, and Project Managers for the projects they
 *       manage.
 *
 *
 *       A **soft delete**: the task disappears from every list and counts, while its comments and history stay stored. Not possible in archived projects (400).
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/NoDataOk"
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
router.delete('/:id', manage, validate(taskIdParamSchema), controller.deleteTask);

/**
 * @openapi
 * "/api/tasks/{id}/comments":
 *   get:
 *     tags:
 *       - Tasks
 *     summary: List a task's comments
 *     description: >-
 *       **Who:** any signed-in user.
 *
 *
 *       Newest first, one page at a time. Anyone who can see the task can read its comments.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *       - $ref: "#/components/parameters/PageQuery"
 *       - name: limit
 *         in: query
 *         description: Items per page (1–50).
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/CommentListOk"
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
router.get('/:id/comments', validate(taskFeedSchema), controller.listComments);
/**
 * @openapi
 * "/api/tasks/{id}/comments":
 *   post:
 *     tags:
 *       - Tasks
 *     summary: Add a comment to a task
 *     description: >-
 *       **Who:** any signed-in user.
 *
 *
 *       Anyone who can see the task may comment, except on tasks of archived projects (400). The assignee and creator are notified. Comments cannot be edited or deleted.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/AddCommentRequest"
 *           example:
 *             content: Looks good, please add the error states.
 *     responses:
 *       "201":
 *         $ref: "#/components/responses/CommentCreatedOk"
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
router.post('/:id/comments', validate(addCommentSchema), controller.addComment);
/**
 * @openapi
 * "/api/tasks/{id}/activities":
 *   get:
 *     tags:
 *       - Tasks
 *       - Activities
 *     summary: Get a task's history
 *     description: |-
 *       **Who:** any signed-in user.
 *
 *       Newest first, one page at a time.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *       - $ref: "#/components/parameters/PageQuery"
 *       - name: limit
 *         in: query
 *         description: Items per page (1–50).
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/TaskActivityListOk"
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
router.get('/:id/activities', validate(taskFeedSchema), controller.listTaskActivities);

export default router;
