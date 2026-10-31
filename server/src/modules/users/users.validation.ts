import { Role } from '@prisma/client';
import { z } from 'zod';
import { ASSIGNABLE_ROLES } from '../../constants.js';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: passwordSchema,
    role: z.enum(
      ASSIGNABLE_ROLES as unknown as [string, ...string[]],
      { message: `Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}` },
    ).transform((v) => v as typeof ASSIGNABLE_ROLES[number]),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'User ID is required'),
  }),
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
  }).refine((b) => Object.keys(b).length > 0, { message: 'At least one field is required' }),
});

export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'User ID is required'),
  }),
  body: z.object({
    isActive: z.boolean({ message: 'isActive must be a boolean' }),
  }),
});

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
    role: z.nativeEnum(Role).optional(),
    isActive: z
      .string()
      .optional()
      .transform((v) => {
        if (v === 'true') return true;
        if (v === 'false') return false;
        return undefined;
      }),
  }),
});

export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'User ID is required'),
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>['body'];
export type ListUsersQuery = z.infer<typeof listUsersSchema>['query'];
