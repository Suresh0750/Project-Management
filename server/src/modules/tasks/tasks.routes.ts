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
  taskIdParamSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from './tasks.validation.js';

const router = Router();

// Every route needs a valid session. Per-task access and permissions live in the service.
router.use(authenticate);

const manage = authorize(Role.ADMIN, Role.PROJECT_MANAGER);

router.get('/', validate(listTasksSchema), controller.listTasks);
router.post('/', manage, validate(createTaskSchema), controller.createTask);

router.get('/:id', validate(taskIdParamSchema), controller.getTask);
// Members may edit the description / status of tasks assigned to them; the service decides.
router.patch('/:id', validate(updateTaskSchema), controller.updateTask);
router.patch('/:id/status', validate(updateTaskStatusSchema), controller.updateTaskStatus);
router.patch('/:id/assign', manage, validate(assignTaskSchema), controller.assignTask);
router.delete('/:id', manage, validate(taskIdParamSchema), controller.deleteTask);

router.get('/:id/comments', validate(taskIdParamSchema), controller.listComments);
router.post('/:id/comments', validate(addCommentSchema), controller.addComment);
router.get('/:id/activities', validate(taskIdParamSchema), controller.listTaskActivities);

export default router;
