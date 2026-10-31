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

// GET    /api/projects                      (scoped to the caller's role)
router.get('/', validate(listProjectsSchema), controller.listProjects);

// POST   /api/projects
router.post('/', manage, validate(createProjectSchema), controller.createProject);

// GET    /api/projects/:id
router.get('/:id', validate(projectIdParamSchema), controller.getProject);

// PATCH  /api/projects/:id
router.patch('/:id', manage, validate(updateProjectSchema), controller.updateProject);

// PATCH  /api/projects/:id/archive
router.patch('/:id/archive', manage, validate(archiveProjectSchema), controller.archiveProject);

// GET    /api/projects/:id/member-candidates
router.get(
  '/:id/member-candidates',
  manage,
  validate(memberCandidatesSchema),
  controller.listMemberCandidates,
);

// POST   /api/projects/:id/members
router.post('/:id/members', manage, validate(addMemberSchema), controller.addMember);

// DELETE /api/projects/:id/members/:userId
router.delete('/:id/members/:userId', manage, validate(removeMemberSchema), controller.removeMember);

// GET    /api/projects/:id/activities
router.get('/:id/activities', validate(projectActivitiesSchema), controller.listProjectActivities);

export default router;
