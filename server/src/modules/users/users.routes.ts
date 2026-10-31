import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import * as usersController from './users.controller.js';
import {
  createUserSchema,
  listUsersSchema,
  updateUserSchema,
  updateUserStatusSchema,
  userIdParamSchema,
} from './users.validation.js';

const router = Router();

// All user management routes require authentication + ADMIN role
router.use(authenticate, authorize(Role.ADMIN));

// GET  /api/users
router.get('/', validate(listUsersSchema), usersController.listUsers);

// GET  /api/users/:id
router.get('/:id', validate(userIdParamSchema), usersController.getUserById);

// POST /api/users
router.post('/', validate(createUserSchema), usersController.createUser);

// PATCH /api/users/:id
router.patch('/:id', validate(updateUserSchema), usersController.updateUser);

// PATCH /api/users/:id/status
router.patch('/:id/status', validate(updateUserStatusSchema), usersController.updateUserStatus);

export default router;
