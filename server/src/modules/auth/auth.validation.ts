import { z } from 'zod';
import { passwordSchema } from '../../utils/passwordPolicy.js';
import { capitalizeWords, lineString } from '../../utils/text.js';

export const registerSchema = z.object({
  body: z.object({
    name: lineString()
      .pipe(z.string().min(2, 'Name must be at least 2 characters').max(100))
      .transform(capitalizeWords),
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: passwordSchema,
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({ email: z.string().trim().toLowerCase().email('Invalid email address') }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    otp: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
    newPassword: passwordSchema,
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .max(72, 'Password must be at most 72 characters')
      .refine((value) => value.trim().length > 0, 'Password is required'),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    otp: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  }),
});

export const resendOtpSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
  }),
});

export const updateProfileSchema = z.object({
  body: z
    .object({
      name: lineString()
        .pipe(z.string().min(2, 'Name must be at least 2 characters').max(100))
        .optional(),
      email: z.string().trim().toLowerCase().max(254).email('Invalid email address').optional(),
      // Required only when the email address changes.
      currentPassword: z.string().min(1).max(72).optional(),
    })
    .refine((body) => body.name !== undefined || body.email !== undefined, {
      message: 'At least one field is required',
    }),
});

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1, 'Current password is required').max(72),
      newPassword: passwordSchema,
    })
    .refine((body) => body.newPassword !== body.currentPassword, {
      path: ['newPassword'],
      message: 'New password must be different from the current password',
    }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>['body'];
export type ResendOtpInput = z.infer<typeof resendOtpSchema>['body'];
