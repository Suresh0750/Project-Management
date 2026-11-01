import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { prisma } from '../../../prisma/client.js';
import { env } from '../../config/env.js';
import { HttpError } from '../../utils/httpError.js';
import { sendMail, verificationEmail } from '../../utils/mailer.js';

const GENERIC_INVALID = 'The code is invalid or has expired. Request a new one.';

function fieldError(status: number, message: string): HttpError {
  // Never 401: the client treats 401 as "session expired" and would try to refresh.
  return new HttpError(status, message, [{ path: 'otp', message }]);
}

// Only a keyed hash is stored, so a database leak does not reveal live codes.
function hashCode(userId: string, code: string): string {
  return createHmac('sha256', env.COOKIE_SECRET).update(`${userId}:${code}`).digest('hex');
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

/**
 * Creates a fresh code (replacing any previous one), emails it, and returns how long the user
 * must wait before asking for another. Throws 429 inside the cooldown window.
 */
export async function issueOtp(user: OtpTarget): Promise<{ resendAfterSeconds: number }> {
  const cooldown = env.OTP_RESEND_COOLDOWN_SECONDS;

  const existing = await prisma.emailVerification.findUnique({ where: { userId: user.id } });
  if (existing) {
    const elapsed = (Date.now() - existing.sentAt.getTime()) / 1000;
    if (elapsed < cooldown) {
      const wait = Math.ceil(cooldown - elapsed);
      throw fieldError(429, `Please wait ${wait} seconds before requesting another code`);
    }
  }

  const code = generateCode();
  const now = new Date();
  const data = {
    codeHash: hashCode(user.id, code),
    expiresAt: new Date(now.getTime() + env.OTP_TTL_MINUTES * 60_000),
    attempts: 0,
    sentAt: now,
  };
  await prisma.emailVerification.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
  });

  try {
    await sendMail({ to: user.email, ...verificationEmail(user.name, code, env.OTP_TTL_MINUTES) });
  } catch (error) {
    console.error('Failed to send verification email', error);
    // Free the cooldown so the user can retry straight away.
    await prisma.emailVerification.deleteMany({ where: { userId: user.id } });
    throw new HttpError(503, 'We could not send the verification email. Please try again shortly.');
  }

  return { resendAfterSeconds: cooldown };
}

/**
 * Checks a submitted code. The attempt counter is incremented atomically *before* comparing, so
 * parallel guesses cannot exceed the limit. A correct code is consumed (single use).
 */
export async function consumeOtp(userId: string, code: string): Promise<void> {
  const record = await prisma.emailVerification.findUnique({ where: { userId } });
  if (!record) throw fieldError(400, GENERIC_INVALID);

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.emailVerification.deleteMany({ where: { userId } });
    throw fieldError(400, GENERIC_INVALID);
  }

  const { attempts } = await prisma.emailVerification.update({
    where: { userId },
    data: { attempts: { increment: 1 } },
    select: { attempts: true },
  });

  if (attempts > env.OTP_MAX_ATTEMPTS) {
    await prisma.emailVerification.deleteMany({ where: { userId } });
    throw fieldError(400, 'Too many incorrect attempts. Request a new code.');
  }

  if (!safeEqual(record.codeHash, hashCode(userId, code))) {
    const remaining = env.OTP_MAX_ATTEMPTS - attempts;
    throw fieldError(
      400,
      remaining > 0
        ? `Incorrect code. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} left.`
        : 'Too many incorrect attempts. Request a new code.',
    );
  }

  await prisma.emailVerification.deleteMany({ where: { userId } });
}
