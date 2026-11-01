import { z } from 'zod';

// Blank values in .env (KEY=) count as "not set".
const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Use 'none' only when client and API are on different sites (requires HTTPS)
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET must be at least 32 chars'),

  // Email delivery for verification codes. Optional in development (codes are logged to the
  // server console instead); required in production.
  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  // e.g. "ProjectFlow <no-reply@yourdomain.com>"
  SMTP_FROM: optionalString,

  OTP_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(10),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(10).max(600).default(60),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(10).default(5),
}).superRefine((values, ctx) => {
  if (values.NODE_ENV === 'production' && (!values.SMTP_HOST || !values.SMTP_FROM)) {
    ctx.addIssue({
      code: 'custom',
      path: ['SMTP_HOST'],
      message: 'SMTP_HOST and SMTP_FROM are required in production to deliver verification codes',
    });
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
