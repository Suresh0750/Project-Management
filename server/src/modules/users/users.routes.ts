import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import * as usersController from './users.controller.js';
import {
  confirmEmailChangeSchema,
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

// POST /api/users/:id/email/verify   (enter the code sent to the new address; applies the change)
router.post('/:id/email/verify', validate(confirmEmailChangeSchema), usersController.confirmEmailChange);

// POST /api/users/:id/email/resend
router.post('/:id/email/resend', validate(userIdParamSchema), usersController.resendEmailChangeCode);

// DELETE /api/users/:id/email/pending   (cancel a change that is waiting for its code)
router.delete('/:id/email/pending', validate(userIdParamSchema), usersController.cancelEmailChange);

// PATCH /api/users/:id/status
router.patch('/:id/status', validate(updateUserStatusSchema), usersController.updateUserStatus);

export default router;
