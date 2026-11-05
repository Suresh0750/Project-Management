import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import type { OtpPurpose } from '@prisma/client';
import { prisma } from '../../../prisma/client.js';
import { env } from '../../config/env.js';
import { HttpError } from '../../utils/httpError.js';
import { verificationEmail } from '../../utils/emailTemplates.js';
import { logError } from '../../utils/logger.js';
import { sendMail } from '../../utils/mailer.js';

/**
 * One-time codes for every flow, stored in one table (OtpCode) and verified by one function:
 *
 *   SIGNUP          confirms a new account's email address
 *   EMAIL_CHANGE    confirms the new address when an administrator changes someone's email
 *   PASSWORD_RESET  lets someone who forgot their password choose a new one
 *
 * A user has at most one live code per purpose; asking for another replaces it. Only a keyed
 * hash of the code is stored, never the code itself.
 */

const GENERIC_INVALID = 'The code is invalid or has expired. Request a new one.';

const EMAIL_PURPOSE = {
  SIGNUP: 'signup',
  EMAIL_CHANGE: 'email-change',
  PASSWORD_RESET: 'password-reset',
} as const;

function fieldError(status: number, message: string): HttpError {
  // Never 401: the client treats 401 as "session expired" and would try to refresh.
  return new HttpError(status, message, [{ path: 'otp', message }]);
}

// The purpose is part of what is hashed, so a code for one purpose can never be accepted for another.
function hashCode(purpose: OtpPurpose, userId: string, code: string): string {
  return createHmac('sha256', env.COOKIE_SECRET).update(`${purpose}:${userId}:${code}`).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Cryptographically random 6-digit code (leading zeros kept). */
function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export interface OtpTarget {
  id: string;
  name: string;
  email: string;
}

interface IssueOptions {
  /** EMAIL_CHANGE: the address the code is sent to and that will replace the current one. */
  newEmail?: string;
  /**
   * For flows that must not reveal whether an account exists (password reset): inside the
   * cooldown, or if the email cannot be sent, answer normally instead of with an error.
   */
  quiet?: boolean;
}

/**
 * Creates a fresh code for `purpose` (replacing any previous one), emails it, and returns how long
 * the user must wait before asking for another. Inside the cooldown it throws 429 (or, when
 * `quiet`, does nothing).
 */
export async function issueOtp(
  user: OtpTarget,
  purpose: OtpPurpose,
  options: IssueOptions = {},
): Promise<{ resendAfterSeconds: number }> {
  const cooldown = env.OTP_RESEND_COOLDOWN_SECONDS;
  const answer = { resendAfterSeconds: cooldown };
  const key = { userId_purpose: { userId: user.id, purpose } };

  const existing = await prisma.otpCode.findUnique({ where: key });
  if (existing) {
    const elapsed = (Date.now() - existing.sentAt.getTime()) / 1000;
    if (elapsed < cooldown) {
      if (options.quiet) return answer;
      const wait = Math.ceil(cooldown - elapsed);
      throw fieldError(429, `Please wait ${wait} seconds before requesting another code`);
    }
  }

  const code = generateCode();
  const now = new Date();
  const data = {
    codeHash: hashCode(purpose, user.id, code),
    newEmail: options.newEmail ?? null,
    expiresAt: new Date(now.getTime() + env.OTP_TTL_MINUTES * 60_000),
    attempts: 0,
    sentAt: now,
  };
  await prisma.otpCode.upsert({
    where: key,
    update: data,
    create: { userId: user.id, purpose, ...data },
  });

  const recipient = options.newEmail ?? user.email;
  try {
    await sendMail({
      to: recipient,
      ...verificationEmail({
        name: user.name,
        email: recipient,
        code,
        ttlMinutes: env.OTP_TTL_MINUTES,
        purpose: EMAIL_PURPOSE[purpose],
      }),
    });
  } catch (error) {
    logError('Failed to send the verification code email', error, { purpose });
    // Free the cooldown so the user can retry straight away.
    await prisma.otpCode.deleteMany({ where: { userId: user.id, purpose } });
    if (options.quiet) return answer;
    throw new HttpError(503, 'We could not send the verification email. Please try again shortly.');
  }

  return answer;
}

/**
 * Checks a submitted code for `purpose`. The attempt counter is incremented atomically *before*
 * comparing, so parallel guesses cannot exceed the limit. A correct code is consumed (single use).
 */
export async function consumeOtp(
  userId: string,
  purpose: OtpPurpose,
  code: string,
): Promise<{ newEmail: string | null }> {
  const key = { userId_purpose: { userId, purpose } };
  const record = await prisma.otpCode.findUnique({ where: key });
  if (!record) throw fieldError(400, GENERIC_INVALID);

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.otpCode.deleteMany({ where: { userId, purpose } });
    throw fieldError(400, GENERIC_INVALID);
  }

  const { attempts } = await prisma.otpCode.update({
    where: key,
    data: { attempts: { increment: 1 } },
    select: { attempts: true },
  });

  if (attempts > env.OTP_MAX_ATTEMPTS) {
    await prisma.otpCode.deleteMany({ where: { userId, purpose } });
    throw fieldError(400, 'Too many incorrect attempts. Request a new code.');
  }

  if (!safeEqual(record.codeHash, hashCode(purpose, userId, code))) {
    const remaining = env.OTP_MAX_ATTEMPTS - attempts;
    throw fieldError(
      400,
      remaining > 0
        ? `Incorrect code. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} left.`
        : 'Too many incorrect attempts. Request a new code.',
    );
  }

  await prisma.otpCode.deleteMany({ where: { userId, purpose } });
  return { newEmail: record.newEmail };
}
