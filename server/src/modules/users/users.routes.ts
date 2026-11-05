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

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *       - Admin
 *     summary: List users
 *     description: >-
 *       **Who:** administrators only (ADMIN).
 *
 *
 *       Paged, with optional search (name or email), role and active-state filters.
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
 *       - name: role
 *         in: query
 *         description: Only users with this role.
 *         schema:
 *           $ref: "#/components/schemas/Role"
 *       - name: isActive
 *         in: query
 *         description: Only active (`true`) or deactivated (`false`) users.
 *         schema:
 *           type: string
 *           enum:
 *             - "true"
 *             - "false"
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/UserListOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
// GET  /api/users
router.get('/', validate(listUsersSchema), usersController.listUsers);

/**
 * @openapi
 * "/api/users/{id}":
 *   get:
 *     tags:
 *       - Users
 *       - Admin
 *     summary: Get a user
 *     description: >-
 *       **Who:** administrators only (ADMIN).
 *
 *
 *       Includes admin-only extras: a pending email change, why the role is locked (`roleLockedReason`), and the projects the user manages or belongs to.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/UserDetailOk"
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
// GET  /api/users/:id
router.get('/:id', validate(userIdParamSchema), usersController.getUserById);

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags:
 *       - Users
 *       - Admin
 *     summary: Create a user
 *     description: >-
 *       **Who:** administrators only (ADMIN).
 *
 *
 *       Creates a PROJECT_MANAGER or MEMBER account that is **already verified** (the administrator vouches for it; no code is needed). Administrators cannot be created through the API. An address already in use is 409.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CreateUserRequest"
 *           example:
 *             name: Sam Rivera
 *             email: sam.rivera@example.com
 *             password: Str0ng!Passw0rd
 *             role: MEMBER
 *     responses:
 *       "201":
 *         $ref: "#/components/responses/UserCreatedOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "409":
 *         $ref: "#/components/responses/Conflict"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
// POST /api/users
router.post('/', validate(createUserSchema), usersController.createUser);

/**
 * @openapi
 * "/api/users/{id}":
 *   patch:
 *     tags:
 *       - Users
 *       - Admin
 *     summary: Update a user
 *     description: >-
 *       **Who:** administrators only (ADMIN).
 *
 *
 *       **Name and role** apply at once. A **changed email does not**: for a verified account the new address is sent a 6-digit code and only replaces the old one when `POST /api/users/{id}/email/verify` is called (`emailChange` in the response says so). An unverified account's email changes at once.
 *
 *
 *       **Role changes** are refused with 409 while the user still holds work in the old role: a Project Manager must manage no project; a Member must be on no project and hold no task. You cannot change your own role (400) or an administrator's (403). A successful role change signs the user out on every device and emails them.
 *
 *
 *       429 if a code was requested less than 60 seconds ago; 503 if the code email could not be sent.
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
 *             $ref: "#/components/schemas/UpdateUserRequest"
 *           example:
 *             name: Sam Rivera
 *             role: PROJECT_MANAGER
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/UpdateUserOk"
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
 *       "429":
 *         $ref: "#/components/responses/TooManyRequests"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 *       "503":
 *         $ref: "#/components/responses/ServiceUnavailable"
 */
// PATCH /api/users/:id
router.patch('/:id', validate(updateUserSchema), usersController.updateUser);

/**
 * @openapi
 * "/api/users/{id}/email/verify":
 *   post:
 *     tags:
 *       - Users
 *       - Admin
 *     summary: Confirm a pending email change
 *     description: >-
 *       **Who:** administrators only (ADMIN).
 *
 *
 *       Enter the 6-digit code that was emailed to the **new** address. Only now does the user's email change. A wrong, expired or used code is 400 (`errors[].path` = `otp`); so is calling it when no change is pending. 409 if someone took the address in the meantime.
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
 *             $ref: "#/components/schemas/ConfirmEmailChangeRequest"
 *           example:
 *             otp: "482913"
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/UserDetailOk"
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
// POST /api/users/:id/email/verify   (enter the code sent to the new address; applies the change)
router.post('/:id/email/verify', validate(confirmEmailChangeSchema), usersController.confirmEmailChange);

/**
 * @openapi
 * "/api/users/{id}/email/resend":
 *   post:
 *     tags:
 *       - Users
 *       - Admin
 *     summary: Resend the email-change code
 *     description: >-
 *       **Who:** administrators only (ADMIN).
 *
 *
 *       Sends a new code to the pending address (the old code stops working). 400 if no change is pending; 429 inside the 60-second cooldown; 503 if the email could not be sent.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/EmailResendOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "404":
 *         $ref: "#/components/responses/NotFound"
 *       "429":
 *         $ref: "#/components/responses/TooManyRequests"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 *       "503":
 *         $ref: "#/components/responses/ServiceUnavailable"
 */
// POST /api/users/:id/email/resend
router.post('/:id/email/resend', validate(userIdParamSchema), usersController.resendEmailChangeCode);

/**
 * @openapi
 * "/api/users/{id}/email/pending":
 *   delete:
 *     tags:
 *       - Users
 *       - Admin
 *     summary: Cancel a pending email change
 *     description: |-
 *       **Who:** administrators only (ADMIN).
 *
 *       Removes the waiting code; the user's email stays as it is.
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
// DELETE /api/users/:id/email/pending   (cancel a change that is waiting for its code)
router.delete('/:id/email/pending', validate(userIdParamSchema), usersController.cancelEmailChange);

/**
 * @openapi
 * "/api/users/{id}/status":
 *   patch:
 *     tags:
 *       - Users
 *       - Admin
 *     summary: Activate or deactivate a user
 *     description: >-
 *       **Who:** administrators only (ADMIN).
 *
 *
 *       Deactivating signs the user out on every device and emails them. The next request from their open pages is answered with 403 `ACCOUNT_DEACTIVATED`. You cannot deactivate yourself (400).
 *
 *
 *       When deactivating a **Project Manager**, `holdProjects: true` also puts the Planning and Active projects they manage on hold (completed, on-hold and archived ones are left alone). Reactivating only reactivates.
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
 *             $ref: "#/components/schemas/UpdateUserStatusRequest"
 *           example:
 *             isActive: false
 *             holdProjects: true
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/UserStatusOk"
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
// PATCH /api/users/:id/status
router.patch('/:id/status', validate(updateUserStatusSchema), usersController.updateUserStatus);

export default router;
