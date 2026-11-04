import { z } from 'zod';
import { lineString } from '@/lib/text';

const email = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .pipe(z.email('Enter a valid email address'));

// Mirrors the server's password policy (server/src/utils/passwordPolicy.ts) so users see errors
// before submitting. The same list feeds the live checklist under the password fields.
export const PASSWORD_RULES = [
  { id: 'length', label: '8+ characters', message: 'Password must be at least 8 characters', test: (v: string) => v.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', message: 'Include at least one uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { id: 'lower', label: 'One lowercase letter', message: 'Include at least one lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { id: 'number', label: 'One number', message: 'Include at least one number', test: (v: string) => /[0-9]/.test(v) },
  { id: 'special', label: 'One special character', message: 'Include at least one special character', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

export const passwordPolicy = z
  .string()
  .max(72, 'Password must be at most 72 characters')
  .superRefine((value, ctx) => {
    // Report the first rule that is not met, so the message is always one clear next step.
    const unmet = PASSWORD_RULES.find((rule) => !rule.test(value));
    if (unmet) ctx.addIssue({ code: 'custom', message: unmet.message });
  });

export const loginSchema = z.object({
  email,
  // Login only checks the shape, never the strength rules: accounts created before a rule
  // existed must still be able to sign in. A blank (all-space) password can never be valid.
  password: z
    .string()
    .min(1, 'Password is required')
    .max(72, 'Password must be at most 72 characters')
    .refine((value) => value.trim().length > 0, 'Password is required'),
});

export const registerSchema = z
  .object({
    name: lineString().pipe(
      z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be at most 100 characters'),
    ),
    email,
    password: passwordPolicy,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const verifyEmailSchema = z.object({
  email,
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    email,
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Enter the 6-digit code'),
    password: passwordPolicy,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type VerifyEmailValues = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

const personName = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be at most 100 characters');

/** The current password is only needed when the email address actually changes. */
export function profileSchema(originalEmail: string) {
  return z
    .object({
      name: personName,
      email: z
        .string()
        .trim()
        .min(1, 'Email is required')
        .max(254, 'Email must be at most 254 characters')
        .pipe(z.email('Enter a valid email address')),
      currentPassword: z.string(),
    })
    .superRefine((values, ctx) => {
      const changed = values.email.trim().toLowerCase() !== originalEmail.toLowerCase();
      if (changed && !values.currentPassword) {
        ctx.addIssue({
          code: 'custom',
          path: ['currentPassword'],
          message: 'Enter your current password to change your email',
        });
      }
    });
}

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordPolicy,
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .superRefine((values, ctx) => {
    if (values.confirmPassword && values.newPassword !== values.confirmPassword) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match' });
    }
    if (values.newPassword && values.newPassword === values.currentPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['newPassword'],
        message: 'New password must be different from the current password',
      });
    }
  });

export type ProfileValues = z.infer<ReturnType<typeof profileSchema>>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
