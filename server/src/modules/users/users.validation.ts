import { Role } from '@prisma/client';
import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be at most 100 characters');

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Email must be at most 254 characters')
  .email('Invalid email address');

// ADMIN accounts are provisioned through the seed, never through the API.
const assignableRoleSchema = z.enum([Role.PROJECT_MANAGER, Role.MEMBER], {
  message: 'Role must be one of: PROJECT_MANAGER, MEMBER',
});

const idParamSchema = z.object({
  id: z.string().trim().min(1, 'User ID is required').max(64, 'Invalid user ID'),
});

export const createUserSchema = z.object({
  body: z.object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    role: assignableRoleSchema,
  }),
});

export const updateUserSchema = z.object({
  params: idParamSchema,
  body: z
    .object({
      name: nameSchema.optional(),
      email: emailSchema.optional(),
      role: assignableRoleSchema.optional(),
    })
    .refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required' }),
});

export const updateUserStatusSchema = z.object({
  params: idParamSchema,
  body: z.object({
    isActive: z.boolean({ message: 'isActive must be a boolean' }),
  }),
});

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100, 'Search must be at most 100 characters').optional(),
    role: z.nativeEnum(Role).optional(),
    isActive: z
      .enum(['true', 'false'], { message: 'isActive must be "true" or "false"' })
      .optional()
      .transform((value) => (value === undefined ? undefined : value === 'true')),
  }),
});

export const userIdParamSchema = z.object({
  params: idParamSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>['body'];
export type ListUsersQuery = z.infer<typeof listUsersSchema>['query'];
