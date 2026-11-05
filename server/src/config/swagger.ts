import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.js';

/**
 * OpenAPI 3.0.3 document for the API.
 *
 * - Every endpoint is documented with an `@openapi` comment directly above its route, in the
 *   module's own `*.routes.ts` file. This file holds only what is shared: the servers, the
 *   authentication schemes, and the reusable schemas, parameters and responses.
 * - Settings come from the validated environment (config/env.ts); nothing is read from
 *   process.env here and dotenv is not initialised a second time.
 */

type Schema = Record<string, unknown>;

const schemaRef = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });
const responseRef = (name: string): Schema => ({ $ref: `#/components/responses/${name}` });

// ─── Where the route files are ────────────────────────────────────────────────
// Found relative to THIS file, so the same code works from src/*.ts (development, `tsx`) and
// from the compiled dist/**/*.js (production), whatever the build's folder layout is.
const here = fileURLToPath(import.meta.url);
const routeExtension = path.extname(here) === '.ts' ? 'ts' : 'js';
const routeFiles = path
  .join(path.dirname(here), '..', 'modules', '**', `*.routes.${routeExtension}`)
  .split(path.sep)
  .join('/');

// ─── Response helpers ─────────────────────────────────────────────────────────
/** The success envelope every endpoint uses: { success, message, data, meta }. */
const envelope = (data: Schema, meta?: Schema): Schema => ({
  type: 'object',
  required: ['success', 'message', 'data', 'meta'],
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: 'Request completed successfully' },
    data,
    meta: meta ?? { type: 'object', nullable: true, example: null },
  },
});

const ok = (description: string, data: Schema, meta?: Schema, headers?: Schema): Schema => ({
  description,
  ...(headers ? { headers } : {}),
  content: { 'application/json': { schema: envelope(data, meta) } },
});

const nothing: Schema = { type: 'object', nullable: true, example: null };
const listOf = (name: string): Schema => ({ type: 'array', items: schemaRef(name) });
const wrap = (properties: Record<string, Schema>): Schema => ({ type: 'object', properties });

const errorResponse = (description: string, message: string, errors: unknown[] = []): Schema => ({
  description,
  content: {
    'application/json': {
      schema: schemaRef('ErrorResponse'),
      example: { success: false, message, errors },
    },
  },
});

const sessionCookies: Schema = {
  'Set-Cookie': {
    description:
      'Two HttpOnly cookies: `access_token` (Path=/, 15 minutes) and `refresh_token` ' +
      '(Path=/api/auth, 7 days). `Secure` in production; `SameSite` follows COOKIE_SAME_SITE.',
    schema: { type: 'string' },
  },
};

// ─── Shared building blocks ───────────────────────────────────────────────────
const idString: Schema = { type: 'string', maxLength: 64, example: 'cmhx2k1ab0000abcd1234efgh' };
const dateTime: Schema = { type: 'string', format: 'date-time', example: '2026-11-05T09:30:00.000Z' };
const email: Schema = {
  type: 'string',
  format: 'email',
  maxLength: 254,
  description: 'Trimmed and lower-cased before it is validated or stored.',
  example: 'jane.doe@example.com',
};
const personName: Schema = {
  type: 'string',
  minLength: 2,
  maxLength: 100,
  description: 'Trimmed; runs of whitespace collapse to one space (invisible characters are removed).',
  example: 'Jane Doe',
};

const schemas: Record<string, Schema> = {
  // ── Enums ──
  Role: { type: 'string', enum: ['ADMIN', 'PROJECT_MANAGER', 'MEMBER'] },
  AssignableRole: {
    type: 'string',
    enum: ['PROJECT_MANAGER', 'MEMBER'],
    description: 'ADMIN accounts are provisioned by the seed and cannot be created or assigned.',
  },
  ProjectStatus: { type: 'string', enum: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] },
  Priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
  TaskStatus: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] },
  ActivityAction: {
    type: 'string',
    enum: [
      'PROJECT_CREATED',
      'PROJECT_UPDATED',
      'PROJECT_ARCHIVED',
      'MEMBER_ADDED',
      'MEMBER_REMOVED',
      'TASK_CREATED',
      'TASK_UPDATED',
      'TASK_STATUS_CHANGED',
      'TASK_ASSIGNED',
      'TASK_DELETED',
      'COMMENT_ADDED',
    ],
  },
  NotificationType: {
    type: 'string',
    enum: [
      'TASK_ASSIGNED',
      'TASK_STATUS_CHANGED',
      'TASK_COMMENT',
      'TASK_UNASSIGNED',
      'PROJECT_MEMBER_ADDED',
      'PROJECT_MEMBER_REMOVED',
      'PROJECT_MANAGER_ASSIGNED',
      'PROJECT_MANAGER_REMOVED',
    ],
  },

  // ── Errors and paging ──
  FieldError: {
    type: 'object',
    required: ['path', 'message'],
    properties: {
      path: {
        type: 'string',
        description:
          'The field the message belongs to (`body.email`, `query.page`), or a marker such as ' +
          '`code` whose message is a machine-readable code (EMAIL_NOT_VERIFIED, ACCOUNT_DEACTIVATED, ' +
          'ROLE_CHANGED, EMAIL_ALREADY_VERIFIED, PROJECT_HAS_OPEN_TASKS).',
        example: 'body.email',
      },
      message: { type: 'string', example: 'Invalid email address' },
    },
  },
  ErrorResponse: {
    type: 'object',
    required: ['success', 'message', 'errors'],
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Validation failed' },
      errors: { type: 'array', items: schemaRef('FieldError') },
    },
  },
  Pagination: {
    type: 'object',
    required: ['total', 'page', 'limit', 'totalPages'],
    properties: {
      total: { type: 'integer', example: 42 },
      page: { type: 'integer', example: 1 },
      limit: { type: 'integer', example: 10 },
      totalPages: { type: 'integer', example: 5 },
    },
  },
  NotificationPagination: {
    allOf: [
      schemaRef('Pagination'),
      {
        type: 'object',
        required: ['unreadCount'],
        properties: { unreadCount: { type: 'integer', example: 3 } },
      },
    ],
  },

  // ── Reusable field rules (mirror the Zod schemas) ──
  Password: {
    type: 'string',
    minLength: 8,
    maxLength: 72,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,72}$',
    description:
      '8–72 characters with at least one uppercase letter, one lowercase letter, one number and ' +
      'one special character. Never trimmed: spaces are part of the password.',
    example: 'Sunny#Day2026',
  },
  Otp: {
    type: 'string',
    pattern: '^\\d{6}$',
    description: 'Exactly 6 digits. Surrounding whitespace is trimmed.',
    example: '482913',
  },

  // ── Entities ──
  PersonRef: {
    type: 'object',
    properties: { id: idString, name: { type: 'string', example: 'Jane Doe' }, email },
  },
  User: {
    type: 'object',
    properties: {
      id: idString,
      name: { type: 'string', example: 'Jane Doe' },
      email,
      role: schemaRef('Role'),
      isActive: { type: 'boolean', example: true },
      emailVerifiedAt: { ...dateTime, nullable: true },
      createdAt: dateTime,
      updatedAt: dateTime,
    },
  },
  ProjectRef: {
    type: 'object',
    properties: {
      id: idString,
      name: { type: 'string', example: 'Website redesign' },
      status: schemaRef('ProjectStatus'),
      priority: schemaRef('Priority'),
      archivedAt: { ...dateTime, nullable: true },
    },
  },
  UserDetail: {
    allOf: [
      schemaRef('User'),
      {
        type: 'object',
        description: 'Extra fields only the administrator user-detail endpoints return.',
        properties: {
          pendingEmail: {
            type: 'string',
            nullable: true,
            description: 'A new address waiting for its verification code.',
          },
          emailChangeResendAfter: {
            type: 'integer',
            description: 'Seconds until another code may be requested (with pendingEmail).',
          },
          roleLockedReason: {
            type: 'string',
            nullable: true,
            description: 'Why the role cannot be changed right now; null when it can.',
          },
          projects: {
            ...listOf('ProjectRef'),
            description: 'Projects a Project Manager manages, or a Member belongs to (max 100).',
          },
        },
      },
    ],
  },
  Project: {
    type: 'object',
    properties: {
      id: idString,
      name: { type: 'string', example: 'Website redesign' },
      description: { type: 'string', nullable: true },
      status: schemaRef('ProjectStatus'),
      priority: schemaRef('Priority'),
      startDate: { ...dateTime, nullable: true },
      deadline: { ...dateTime, nullable: true },
      archivedAt: { ...dateTime, nullable: true },
      createdAt: dateTime,
      updatedAt: dateTime,
      managerId: idString,
      manager: schemaRef('PersonRef'),
      createdBy: schemaRef('PersonRef'),
      memberCount: { type: 'integer', example: 4 },
      taskCount: { type: 'integer', example: 12 },
      completedTaskCount: { type: 'integer', example: 5 },
      progress: { type: 'integer', minimum: 0, maximum: 100, example: 42 },
    },
  },
  ProjectMember: {
    allOf: [
      schemaRef('User'),
      { type: 'object', properties: { joinedAt: dateTime } },
    ],
  },
  ProjectDetail: {
    allOf: [
      schemaRef('Project'),
      {
        type: 'object',
        properties: {
          members: listOf('ProjectMember'),
          canManage: {
            type: 'boolean',
            description: 'Whether the caller may manage this project (computed for the caller).',
          },
        },
      },
    ],
  },
  ArchiveReadiness: {
    type: 'object',
    properties: {
      canArchive: { type: 'boolean' },
      blockers: { type: 'array', items: { type: 'string' } },
      warnings: { type: 'array', items: { type: 'string' } },
      stats: {
        type: 'object',
        properties: {
          totalTasks: { type: 'integer' },
          completedTasks: { type: 'integer' },
          overdueTasks: { type: 'integer' },
          unassignedTasks: { type: 'integer' },
          memberCount: { type: 'integer' },
        },
      },
    },
  },
  OpenTasks: {
    type: 'object',
    properties: {
      total: { type: 'integer', example: 3 },
      tasks: {
        type: 'array',
        description: 'Up to 20 tasks that are not completed (deleted tasks are not counted).',
        items: {
          type: 'object',
          properties: {
            id: idString,
            title: { type: 'string' },
            status: schemaRef('TaskStatus'),
          },
        },
      },
    },
  },
  TaskPermissions: {
    type: 'object',
    description: 'What the caller may do with this task (computed for the caller).',
    properties: {
      canEdit: { type: 'boolean' },
      canAssign: { type: 'boolean' },
      canDelete: { type: 'boolean' },
      canChangeStatus: { type: 'boolean' },
      canComment: { type: 'boolean' },
    },
  },
  Task: {
    type: 'object',
    properties: {
      id: idString,
      title: { type: 'string', example: 'Design the login page' },
      description: { type: 'string', nullable: true },
      status: schemaRef('TaskStatus'),
      priority: schemaRef('Priority'),
      dueDate: { ...dateTime, nullable: true },
      position: { type: 'integer', description: 'Order inside its status column.', example: 0 },
      projectId: idString,
      creatorId: idString,
      assigneeId: { ...idString, nullable: true },
      createdAt: dateTime,
      updatedAt: dateTime,
      project: {
        type: 'object',
        properties: {
          id: idString,
          name: { type: 'string' },
          archivedAt: { ...dateTime, nullable: true },
        },
      },
      assignee: { ...schemaRef('PersonRef'), nullable: true },
      creator: schemaRef('PersonRef'),
      permissions: schemaRef('TaskPermissions'),
    },
  },
  TaskComment: {
    type: 'object',
    properties: {
      id: idString,
      content: { type: 'string', example: 'Looks good, please add the error states.' },
      createdAt: dateTime,
      author: { type: 'object', properties: { id: idString, name: { type: 'string' } } },
    },
  },
  ActorRef: {
    type: 'object',
    nullable: true,
    properties: { id: idString, name: { type: 'string', example: 'Jane Doe' } },
  },
  ActivityItem: {
    type: 'object',
    description: 'One entry of the append-only history.',
    properties: {
      id: idString,
      action: schemaRef('ActivityAction'),
      message: { type: 'string', example: 'Jane Doe moved "Design" from To Do to In Progress' },
      createdAt: dateTime,
      actor: schemaRef('ActorRef'),
      project: { type: 'object', properties: { id: idString, name: { type: 'string' } } },
      task: {
        type: 'object',
        nullable: true,
        properties: {
          id: idString,
          title: { type: 'string' },
          deleted: { type: 'boolean', description: 'True once the task was deleted.' },
        },
      },
    },
  },
  ProjectActivity: {
    type: 'object',
    properties: {
      id: idString,
      action: schemaRef('ActivityAction'),
      message: { type: 'string' },
      createdAt: dateTime,
      actor: schemaRef('ActorRef'),
    },
  },
  TaskTimelineActivity: {
    type: 'object',
    properties: {
      id: idString,
      action: schemaRef('ActivityAction'),
      message: { type: 'string' },
      metadata: { type: 'object', nullable: true, additionalProperties: true },
      createdAt: dateTime,
      actor: schemaRef('ActorRef'),
    },
  },
  Notification: {
    type: 'object',
    properties: {
      id: idString,
      type: schemaRef('NotificationType'),
      message: { type: 'string', example: 'Jane Doe assigned you the task "Design"' },
      readAt: { ...dateTime, nullable: true, description: 'Null while unread.' },
      createdAt: dateTime,
      projectId: { ...idString, nullable: true },
      taskId: { ...idString, nullable: true },
    },
  },
  DashboardStats: {
    type: 'object',
    properties: {
      role: schemaRef('Role'),
      cards: {
        type: 'object',
        description:
          'Which cards are present depends on the role. Admin: totalUsers, totalProjects, ' +
          'activeProjects and the task counts. Project Manager: myProjects, activeProjects and the ' +
          'task counts. Member: assignedTasks and the task counts of their own tasks.',
        properties: {
          totalUsers: { type: 'integer' },
          totalProjects: { type: 'integer' },
          myProjects: { type: 'integer' },
          activeProjects: { type: 'integer' },
          assignedTasks: { type: 'integer' },
          totalTasks: { type: 'integer' },
          completedTasks: { type: 'integer' },
          pendingTasks: { type: 'integer' },
          overdueTasks: { type: 'integer' },
        },
      },
      taskStatus: {
        type: 'object',
        properties: {
          TODO: { type: 'integer' },
          IN_PROGRESS: { type: 'integer' },
          IN_REVIEW: { type: 'integer' },
          COMPLETED: { type: 'integer' },
        },
      },
      projectCompletion: {
        type: 'array',
        description: 'Up to 8 most recently updated projects (empty for members).',
        items: {
          type: 'object',
          properties: {
            id: idString,
            name: { type: 'string' },
            totalTasks: { type: 'integer' },
            completedTasks: { type: 'integer' },
            progress: { type: 'integer', minimum: 0, maximum: 100 },
          },
        },
      },
      upcomingDeadlines: {
        type: 'array',
        description: 'Open tasks due within 30 days (empty for administrators).',
        items: {
          type: 'object',
          properties: {
            id: idString,
            title: { type: 'string' },
            dueDate: dateTime,
            priority: schemaRef('Priority'),
            status: schemaRef('TaskStatus'),
            project: { type: 'object', properties: { id: idString, name: { type: 'string' } } },
            assignee: {
              type: 'object',
              nullable: true,
              properties: { id: idString, name: { type: 'string' } },
            },
          },
        },
      },
    },
  },

  // ── Request bodies (mirror the Zod validation) ──
  RegisterRequest: {
    type: 'object',
    required: ['name', 'email', 'password'],
    properties: {
      name: {
        ...personName,
        description: `${personName.description as string} The first letter of each word is capitalised.`,
      },
      email,
      password: schemaRef('Password'),
    },
  },
  VerifyEmailRequest: {
    type: 'object',
    required: ['email', 'otp'],
    properties: { email, otp: schemaRef('Otp') },
  },
  EmailRequest: { type: 'object', required: ['email'], properties: { email } },
  ResetPasswordRequest: {
    type: 'object',
    required: ['email', 'otp', 'newPassword'],
    properties: { email, otp: schemaRef('Otp'), newPassword: schemaRef('Password') },
  },
  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email,
      password: {
        type: 'string',
        minLength: 1,
        maxLength: 72,
        description:
          'Only checked for shape here (not blank, at most 72 characters). The strength rules are ' +
          'not applied at login, so accounts created before a rule existed can still sign in.',
        example: 'Sunny#Day2026',
      },
    },
  },
  UpdateProfileRequest: {
    type: 'object',
    minProperties: 1,
    description: 'At least one of `name` or `email`.',
    properties: {
      name: personName,
      email,
      currentPassword: {
        type: 'string',
        minLength: 1,
        maxLength: 72,
        description: 'Required only when the email address changes.',
      },
    },
  },
  ChangePasswordRequest: {
    type: 'object',
    required: ['currentPassword', 'newPassword'],
    properties: {
      currentPassword: { type: 'string', minLength: 1, maxLength: 72 },
      newPassword: {
        allOf: [schemaRef('Password')],
        description: 'Must differ from the current password.',
      },
    },
  },
  CreateUserRequest: {
    type: 'object',
    required: ['name', 'email', 'password', 'role'],
    properties: {
      name: personName,
      email,
      password: schemaRef('Password'),
      role: schemaRef('AssignableRole'),
    },
  },
  UpdateUserRequest: {
    type: 'object',
    minProperties: 1,
    properties: { name: personName, email, role: schemaRef('AssignableRole') },
  },
  ConfirmEmailChangeRequest: {
    type: 'object',
    required: ['otp'],
    properties: { otp: schemaRef('Otp') },
  },
  UpdateUserStatusRequest: {
    type: 'object',
    required: ['isActive'],
    properties: {
      isActive: { type: 'boolean' },
      holdProjects: {
        type: 'boolean',
        description:
          'Only when deactivating a Project Manager: also put the projects they manage on hold ' +
          '(Planning and Active projects become On hold).',
      },
    },
  },
  CreateProjectRequest: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 120, example: 'Website redesign' },
      description: { type: 'string', nullable: true, maxLength: 5000 },
      priority: { allOf: [schemaRef('Priority')], default: 'MEDIUM' },
      status: { allOf: [schemaRef('ProjectStatus')], default: 'PLANNING' },
      startDate: {
        type: 'string',
        format: 'date',
        nullable: true,
        description: 'Cannot be in the past.',
        example: '2026-11-10',
      },
      deadline: {
        type: 'string',
        format: 'date',
        nullable: true,
        description: 'Cannot be in the past or before the start date.',
        example: '2026-12-31',
      },
      managerId: {
        ...idString,
        description:
          'Required for an administrator (who picks the Project Manager). A Project Manager can ' +
          'only create projects for themselves.',
      },
    },
  },
  UpdateProjectRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 120 },
      description: { type: 'string', nullable: true, maxLength: 5000 },
      priority: schemaRef('Priority'),
      status: {
        allOf: [schemaRef('ProjectStatus')],
        description: 'COMPLETED is refused (409) while any task is not completed.',
      },
      startDate: { type: 'string', format: 'date', nullable: true },
      deadline: {
        type: 'string',
        format: 'date',
        nullable: true,
        description: 'Cannot be before the start date.',
      },
      managerId: { ...idString, description: 'Administrators only.' },
    },
  },
  ArchiveProjectRequest: {
    type: 'object',
    properties: {
      archived: {
        type: 'boolean',
        default: true,
        description: 'true archives, false restores.',
      },
    },
  },
  AddMemberRequest: {
    type: 'object',
    required: ['userId'],
    properties: { userId: idString },
  },
  CreateTaskRequest: {
    type: 'object',
    required: ['title', 'projectId'],
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 200, example: 'Design the login page' },
      description: { type: 'string', nullable: true, maxLength: 5000 },
      projectId: idString,
      assigneeId: {
        ...idString,
        nullable: true,
        description: 'Must be an active member of the project.',
      },
      priority: { allOf: [schemaRef('Priority')], default: 'MEDIUM' },
      status: { allOf: [schemaRef('TaskStatus')], default: 'TODO' },
      dueDate: {
        type: 'string',
        format: 'date',
        nullable: true,
        description: 'Cannot be in the past.',
        example: '2026-11-20',
      },
    },
  },
  UpdateTaskRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 200 },
      description: { type: 'string', nullable: true, maxLength: 5000 },
      priority: schemaRef('Priority'),
      dueDate: {
        type: 'string',
        format: 'date',
        nullable: true,
        description: 'Cannot be moved to a past date (keeping an existing one is fine).',
      },
    },
  },
  UpdateTaskStatusRequest: {
    type: 'object',
    required: ['status'],
    properties: {
      status: schemaRef('TaskStatus'),
      beforeTaskId: {
        ...idString,
        nullable: true,
        description: 'Place the task directly before this one in the target column; omit to append.',
      },
    },
  },
  AssignTaskRequest: {
    type: 'object',
    required: ['assigneeId'],
    properties: {
      assigneeId: {
        ...idString,
        nullable: true,
        description: 'null unassigns the task.',
      },
    },
  },
  AddCommentRequest: {
    type: 'object',
    required: ['content'],
    properties: {
      content: {
        type: 'string',
        minLength: 1,
        maxLength: 2000,
        description: 'Trimmed; line breaks are kept.',
        example: 'Looks good, please add the error states.',
      },
    },
  },
};

// ─── Reusable parameters ──────────────────────────────────────────────────────
const parameters: Record<string, Schema> = {
  IdPath: {
    name: 'id',
    in: 'path',
    required: true,
    description: 'The record id.',
    schema: idString,
  },
  UserIdPath: {
    name: 'userId',
    in: 'path',
    required: true,
    description: 'The user id.',
    schema: idString,
  },
  PageQuery: {
    name: 'page',
    in: 'query',
    description: 'Page number, starting at 1.',
    schema: { type: 'integer', minimum: 1, default: 1 },
  },
  SearchQuery: {
    name: 'search',
    in: 'query',
    description: 'Text to search for (trimmed, at most 100 characters).',
    schema: { type: 'string', maxLength: 100 },
  },
};

// ─── Reusable responses ───────────────────────────────────────────────────────
const responses: Record<string, Schema> = {
  // Errors, produced by the global error handler and the validation middleware.
  BadRequest: errorResponse('Validation failed (or another invalid request).', 'Validation failed', [
    { path: 'body.email', message: 'Invalid email address' },
  ]),
  Unauthorized: errorResponse('No valid session: missing, expired or revoked token.', 'Authentication required'),
  Forbidden: errorResponse(
    'Signed in, but not allowed to do this.',
    'You do not have permission to perform this action',
  ),
  NotFound: errorResponse('The record does not exist or the caller cannot see it.', 'Not found'),
  Conflict: errorResponse('The request conflicts with existing data.', 'Email address is already registered', [
    { path: 'email', message: 'Email address is already registered' },
  ]),
  TooManyRequests: errorResponse('Rate limit exceeded.', 'Too many attempts. Please try again later.'),
  ServerError: errorResponse(
    'Unexpected server error. The details are in the server log under the `x-request-id` header.',
    'Something went wrong on our side. Please try again later.',
  ),
  ServiceUnavailable: errorResponse(
    'The database or another dependency is unavailable.',
    'The service is temporarily unavailable. Please try again in a moment.',
  ),

  // Authentication
  OtpSentOk: ok(
    'A code was emailed (if sending is possible).',
    wrap({ email, resendAfterSeconds: { type: 'integer', example: 60 } }),
  ),
  ResendAfterOk: ok(
    'Always the same answer, whether or not an account exists.',
    wrap({ resendAfterSeconds: { type: 'integer', example: 60 } }),
  ),
  NoDataOk: ok('Done.', nothing),
  AuthSessionOk: ok('Signed in. The session cookies are set.', wrap({ user: schemaRef('User') }), undefined, sessionCookies),
  UserOk: ok('The user.', wrap({ user: schemaRef('User') })),

  // Users
  UserListOk: ok('A page of users.', listOf('User'), schemaRef('Pagination')),
  UserDetailOk: ok('The user, with admin-only extras.', wrap({ user: schemaRef('UserDetail') })),
  UserCreatedOk: ok('The new user (already verified).', wrap({ user: schemaRef('User') })),
  UpdateUserOk: ok(
    'The updated user. `emailChange` is set when the email was NOT changed yet because a code was sent to the new address.',
    wrap({
      user: schemaRef('UserDetail'),
      emailChange: {
        type: 'object',
        nullable: true,
        properties: {
          newEmail: email,
          resendAfterSeconds: { type: 'integer', example: 60 },
        },
      },
    }),
  ),
  EmailResendOk: ok(
    'A new code was sent to the pending address.',
    wrap({ newEmail: email, resendAfterSeconds: { type: 'integer', example: 60 } }),
  ),
  UserStatusOk: ok(
    'The updated user.',
    wrap({
      user: schemaRef('User'),
      heldProjects: { type: 'integer', description: 'Projects put on hold with the deactivation.', example: 0 },
    }),
  ),

  // Projects
  ProjectListOk: ok('A page of projects the caller may see.', listOf('Project'), schemaRef('Pagination')),
  ProjectDetailOk: ok('The project.', wrap({ project: schemaRef('ProjectDetail') })),
  ProjectCreatedOk: ok('The new project.', wrap({ project: schemaRef('ProjectDetail') })),
  MemberAddedOk: ok('The project, now including the new member.', wrap({ project: schemaRef('ProjectDetail') })),
  OpenTasksOk: ok('The tasks that still stop the project from being completed.', schemaRef('OpenTasks')),
  ArchiveReadinessOk: ok('Whether the project can be archived, and why not.', wrap({ readiness: schemaRef('ArchiveReadiness') })),
  MemberCandidatesOk: ok('Up to 20 active, verified Members not yet on the project.', listOf('PersonRef')),
  ProjectActivityListOk: ok('A page of the project\'s activity, newest first.', listOf('ProjectActivity'), schemaRef('Pagination')),

  // Tasks
  TaskListOk: ok('A page of tasks the caller may see.', listOf('Task'), schemaRef('Pagination')),
  TaskOk: ok('The task.', wrap({ task: schemaRef('Task') })),
  TaskCreatedOk: ok('The new task.', wrap({ task: schemaRef('Task') })),
  CommentListOk: ok('A page of comments, newest first.', listOf('TaskComment'), schemaRef('Pagination')),
  CommentCreatedOk: ok('The new comment.', wrap({ comment: schemaRef('TaskComment') })),
  TaskActivityListOk: ok('A page of the task\'s activity, newest first.', listOf('TaskTimelineActivity'), schemaRef('Pagination')),

  // Activity, notifications, dashboard
  ActivityListOk: ok('A page of activity, newest first.', listOf('ActivityItem'), schemaRef('Pagination')),
  NotificationListOk: ok('A page of the caller\'s notifications.', listOf('Notification'), schemaRef('NotificationPagination')),
  UnreadCountOk: ok('The number of unread notifications.', wrap({ unreadCount: { type: 'integer', example: 3 } })),
  UpdatedCountOk: ok('How many notifications were marked as read.', wrap({ updated: { type: 'integer', example: 3 } })),
  NotificationOk: ok('The notification, now read.', wrap({ notification: schemaRef('Notification') })),
  DashboardStatsOk: ok('Figures for the caller\'s role.', schemaRef('DashboardStats')),
  DashboardActivityOk: ok('Recent activity.', listOf('ActivityItem')),
  DashboardProjectsOk: ok('Recent (not archived) projects.', listOf('Project')),
};

// ─── Endpoints that are not in a module's routes file ─────────────────────────
const paths: Record<string, Schema> = {
  '/api/health': {
    get: {
      tags: ['System'],
      summary: 'Health check',
      description: 'Public. Used by load balancers and uptime checks.',
      security: [],
      responses: {
        '200': ok(
          'The API is up.',
          wrap({
            status: { type: 'string', example: 'ok' },
            service: { type: 'string', example: 'project-management-api' },
          }),
        ),
      },
    },
  },
};

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Project Management API',
      version: '1.0.0',
      description: [
        'REST API of the Project Management & Task Tracking system.',
        '',
        '**Authentication.** Signing in (`POST /api/auth/login`) sets two HttpOnly cookies, ' +
          '`access_token` (15 minutes) and `refresh_token` (7 days). Protected endpoints accept the ' +
          'access token either as that cookie or as `Authorization: Bearer <token>`; the Bearer header ' +
          'wins when both are sent. `POST /api/auth/refresh` renews the session from the refresh cookie. ' +
          'In Swagger UI, call login once: the browser then sends the cookies on every later request.',
        '',
        '**Roles.** ADMIN, PROJECT_MANAGER and MEMBER. Each endpoint lists who may call it; what a ' +
          'caller sees is also limited by role (a manager sees only the projects they manage, a member ' +
          'only the projects they belong to).',
        '',
        '**Responses.** Success: `{ success: true, message, data, meta }` (`meta` carries paging). ' +
          'Errors: `{ success: false, message, errors: [{ path, message }] }`. Every response carries an ' +
          '`x-request-id` header; quote it when reporting a problem.',
      ].join('\n'),
    },
    servers: [
      {
        url: env.SWAGGER_SERVER_URL ?? `http://localhost:${env.PORT}`,
        description: env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    tags: [
      { name: 'Authentication', description: 'Sign up, sign in, sessions, password reset and own profile.' },
      { name: 'Users', description: 'User management (administrators only).' },
      { name: 'Admin', description: 'Administrator-only actions (user management, email change codes).' },
      { name: 'Projects', description: 'Projects, their members and their status.' },
      { name: 'Tasks', description: 'Tasks, assignment, status, comments and task history.' },
      { name: 'Activities', description: 'Append-only history of what happened in projects and tasks.' },
      { name: 'Notifications', description: 'The caller\'s own notifications.' },
      { name: 'Dashboard', description: 'Role-based figures and recent items.' },
      { name: 'System', description: 'Service status.' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'The access token, sent as `Authorization: Bearer <token>`.',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access_token',
          description: 'The HttpOnly `access_token` cookie set at login. Sent automatically by browsers.',
        },
        refreshCookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'refresh_token',
          description:
            'The HttpOnly `refresh_token` cookie (Path=/api/auth, 7 days). It is only sent to /api/auth/* ' +
            'URLs, and is what `/api/auth/refresh` and `/api/auth/logout` use.',
        },
      },
      schemas,
      parameters,
      responses,
    },
    paths,
  },
  apis: [routeFiles],
};

export const swaggerSpec = swaggerJsdoc(options);
