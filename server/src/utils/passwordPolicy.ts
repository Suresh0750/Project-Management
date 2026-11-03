import { z } from 'zod';

/**
 * The one password policy for every place a password is chosen (register, change password,
 * admin creating a user). Keep in step with PASSWORD_RULES in client/src/schemas/auth.ts.
 * Passwords are never trimmed: spaces are allowed as part of a password.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');
