import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import * as controller from './projects.controller.js';
import {
  addMemberSchema,
  archiveProjectSchema,
  createProjectSchema,
  listProjectsSchema,
  memberCandidatesSchema,
  projectActivitiesSchema,
  projectIdParamSchema,
  removeMemberSchema,
  updateProjectSchema,
} from './projects.validation.js';

const router = Router();

// Every route needs a valid session. Per-project visibility is enforced in the service.
router.use(authenticate);

const manage = authorize(Role.ADMIN, Role.PROJECT_MANAGER);

/**
 * @openapi
 * /api/projects:
 *   get:
 *     tags:
 *       - Projects
 *     summary: List projects
 *     description: >-
 *       **Who:** any signed-in user.
 *
 *
 *       Only the projects the caller may see: an administrator sees all, a Project Manager the projects they manage, a Member the projects they belong to. By default archived projects are left out (`archived=true` lists only them).
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
 *           default: 12
 *       - $ref: "#/components/parameters/SearchQuery"
 *       - name: status
 *         in: query
 *         description: Only projects with this status.
 *         schema:
 *           $ref: "#/components/schemas/ProjectStatus"
 *       - name: priority
 *         in: query
 *         description: Only projects with this priority.
 *         schema:
 *           $ref: "#/components/schemas/Priority"
 *       - name: archived
 *         in: query
 *         description: "`true` lists archived projects, `false` the others."
 *         schema:
 *           type: string
 *           enum:
 *             - "true"
 *             - "false"
 *           default: "false"
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/ProjectListOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
// GET    /api/projects                      (scoped to the caller's role)
router.get('/', validate(listProjectsSchema), controller.listProjects);

/**
 * @openapi
 * /api/projects:
 *   post:
 *     tags:
 *       - Projects
 *     summary: Create a project
 *     description: >-
 *       **Who:** administrators and Project Managers.
 *
 *
 *       An administrator must pick the Project Manager (`managerId`); a Project Manager can only create projects for themselves (403 otherwise). The start date and deadline cannot be in the past, and the deadline cannot precede the start date. The manager is notified.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CreateProjectRequest"
 *           example:
 *             name: Website redesign
 *             description: New marketing site
 *             priority: HIGH
 *             status: PLANNING
 *             startDate: 2026-11-10
 *             deadline: 2026-12-31
 *             managerId: cmhx2k1ab0000abcd1234efgh
 *     responses:
 *       "201":
 *         $ref: "#/components/responses/ProjectCreatedOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
// POST   /api/projects
router.post('/', manage, validate(createProjectSchema), controller.createProject);

/**
 * @openapi
 * "/api/projects/{id}":
 *   get:
 *     tags:
 *       - Projects
 *     summary: Get a project
 *     description: >-
 *       **Who:** any signed-in user.
 *
 *
 *       Includes the members and `canManage` (what the caller may do). A project the caller cannot see is reported as 404.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/ProjectDetailOk"
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
// GET    /api/projects/:id
router.get('/:id', validate(projectIdParamSchema), controller.getProject);

/**
 * @openapi
 * "/api/projects/{id}":
 *   patch:
 *     tags:
 *       - Projects
 *     summary: Update a project
 *     description: >-
 *       **Who:** administrators, and Project Managers for the projects they
 *       manage.
 *
 *
 *       Archived projects cannot be modified (400). Only administrators can change `managerId` (403 for a manager); both the new and the old manager are notified.
 *
 *
 *       Setting `status` to **COMPLETED** is refused with 409 (`errors[].message` = `PROJECT_HAS_OPEN_TASKS`) while any task is not completed. Deleted tasks do not count. Use `GET /api/projects/{id}/open-tasks` to list them.
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
 *             $ref: "#/components/schemas/UpdateProjectRequest"
 *           example:
 *             status: ACTIVE
 *             deadline: 2027-01-15
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/ProjectDetailOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "404":
 *         $ref: "#/components/responses/NotFound"
 *       "409":
 *         $ref: "#/components/responses/Conflict"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
// PATCH  /api/projects/:id
router.patch('/:id', manage, validate(updateProjectSchema), controller.updateProject);

/**
 * @openapi
 * "/api/projects/{id}/archive":
 *   patch:
 *     tags:
 *       - Projects
 *     summary: Archive or restore a project
 *     description: >-
 *       **Who:** administrators, and Project Managers for the projects they
 *       manage.
 *
 *
 *       Archiving needs the project to be Completed with every task completed (otherwise 409 with the reasons). Archived projects are read-only. Restoring is always allowed. Check `GET /api/projects/{id}/archive-readiness` first.
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
 *             $ref: "#/components/schemas/ArchiveProjectRequest"
 *           example:
 *             archived: true
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/ProjectDetailOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "404":
 *         $ref: "#/components/responses/NotFound"
 *       "409":
 *         $ref: "#/components/responses/Conflict"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
// PATCH  /api/projects/:id/archive
router.patch('/:id/archive', manage, validate(archiveProjectSchema), controller.archiveProject);

/**
 * @openapi
 * "/api/projects/{id}/open-tasks":
 *   get:
 *     tags:
 *       - Projects
 *     summary: List the tasks that stop a project from being completed
 *     description: >-
 *       **Who:** administrators, and Project Managers for the projects they
 *       manage.
 *
 *
 *       Tasks that are not completed (deleted tasks are not included). At most 20 are returned; `total` is the full count.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/OpenTasksOk"
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
// GET    /api/projects/:id/open-tasks   (what stops the project from being completed)
router.get('/:id/open-tasks', manage, validate(projectIdParamSchema), controller.listOpenTasks);

/**
 * @openapi
 * "/api/projects/{id}/archive-readiness":
 *   get:
 *     tags:
 *       - Projects
 *     summary: Check whether a project can be archived
 *     description: >-
 *       **Who:** administrators, and Project Managers for the projects they
 *       manage.
 *
 *
 *       Returns `blockers` (archiving is refused), `warnings` (worth a look) and task counts.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/ArchiveReadinessOk"
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
// GET    /api/projects/:id/archive-readiness
router.get(
  '/:id/archive-readiness',
  manage,
  validate(projectIdParamSchema),
  controller.getArchiveReadiness,
);

/**
 * @openapi
 * "/api/projects/{id}/member-candidates":
 *   get:
 *     tags:
 *       - Projects
 *     summary: Find members that can be added to a project
 *     description: >-
 *       **Who:** administrators, and Project Managers for the projects they
 *       manage.
 *
 *
 *       Active Members with a verified email who are not on the project yet. At most 20, alphabetical, optionally filtered by name or email.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *       - $ref: "#/components/parameters/SearchQuery"
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/MemberCandidatesOk"
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
// GET    /api/projects/:id/member-candidates
router.get(
  '/:id/member-candidates',
  manage,
  validate(memberCandidatesSchema),
  controller.listMemberCandidates,
);

/**
 * @openapi
 * "/api/projects/{id}/members":
 *   post:
 *     tags:
 *       - Projects
 *     summary: Add a member to a project
 *     description: >-
 *       **Who:** administrators, and Project Managers for the projects they
 *       manage.
 *
 *
 *       Only active Members with a verified email can be added (400 otherwise, and for archived projects). 409 if the user is already on the project. The member is notified.
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
 *             $ref: "#/components/schemas/AddMemberRequest"
 *           example:
 *             userId: cmhx2k1ab0000abcd1234efgh
 *     responses:
 *       "201":
 *         $ref: "#/components/responses/MemberAddedOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "404":
 *         $ref: "#/components/responses/NotFound"
 *       "409":
 *         $ref: "#/components/responses/Conflict"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
// POST   /api/projects/:id/members
router.post('/:id/members', manage, validate(addMemberSchema), controller.addMember);

/**
 * @openapi
 * "/api/projects/{id}/members/{userId}":
 *   delete:
 *     tags:
 *       - Projects
 *     summary: Remove a member from a project
 *     description: >-
 *       **Who:** administrators, and Project Managers for the projects they
 *       manage.
 *
 *
 *       The tasks the member held in this project become unassigned, and the member is notified. 404 if the user is not on the project; 400 for archived projects.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *       - $ref: "#/components/parameters/UserIdPath"
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/ProjectDetailOk"
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
// DELETE /api/projects/:id/members/:userId
router.delete('/:id/members/:userId', manage, validate(removeMemberSchema), controller.removeMember);

/**
 * @openapi
 * "/api/projects/{id}/activities":
 *   get:
 *     tags:
 *       - Projects
 *       - Activities
 *     summary: Get a project's activity
 *     description: |-
 *       **Who:** any signed-in user.
 *
 *       Newest first. Available to anyone who can see the project.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *       - $ref: "#/components/parameters/PageQuery"
 *       - name: limit
 *         in: query
 *         description: Items per page (1–100).
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/ProjectActivityListOk"
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
// GET    /api/projects/:id/activities
router.get('/:id/activities', validate(projectActivitiesSchema), controller.listProjectActivities);

export default router;
