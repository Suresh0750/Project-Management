import { z } from 'zod';
import { passwordPolicy } from '@/schemas/auth';
import { ROLES, type Role } from '@/types/auth';

export const ASSIGNABLE_ROLES = ['PROJECT_MANAGER', 'MEMBER'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

const name = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be at most 100 characters');

const email = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(254, 'Email must be at most 254 characters')
  .pipe(z.email('Enter a valid email address'));

const role = z.enum(ASSIGNABLE_ROLES, { message: 'Select a role' });

export const createUserSchema = z.object({ name, email, role, password: passwordPolicy });

// Editing keeps the user's current role (possibly ADMIN, which is read-only). The password is
// part of the shape only so one form serves both modes; it is never sent when editing.
export const editUserSchema = z.object({ name, email, role: z.enum(ROLES), password: z.string() });

export interface UserFormValues {
  name: string;
  email: string;
  role: Role;
  password: string;
}

export const USER_ROLE_FILTERS = ROLES;
