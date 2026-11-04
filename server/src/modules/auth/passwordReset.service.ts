import bcrypt from 'bcryptjs';
import { prisma } from '../../../prisma/client.js';
import { env } from '../../config/env.js';
import { HttpError } from '../../utils/httpError.js';
import { verificationEmail } from '../../utils/emailTemplates.js';
import { sendMail } from '../../utils/mailer.js';
import { generateCode, hashCode, safeEqual } from './otp.service.js';
import { endAllSessions } from './session.service.js';

const SALT_ROUNDS = 12;
const INVALID = 'The code is invalid or has expired. Request a new one.';

function codeError(message: string): HttpError {
  // Never 401: the client treats 401 as "session expired" and would try to refresh.
  return new HttpError(400, message, [{ path: 'otp', message }]);
}

// Reset codes are hashed with their own prefix, so a signup/email-change code can never be
// replayed as a reset code.
const resetKey = (userId: string) => `reset:${userId}`;

/**
 * Emails a one-time code to the address, if it belongs to an active account. The answer is
 * always the same, whether or not the account exists or the code could be sent, so the endpoint
 * cannot be used to find out which emails are registered.
 */
export async function requestPasswordReset(email: string): Promise<{ resendAfterSeconds: number }> {
  const answer = { resendAfterSeconds: env.OTP_RESEND_COOLDOWN_SECONDS };

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, isActive: true },
  });
  if (!user || !user.isActive) return answer;

  // Inside the cooldown: say nothing new and send nothing (no "please wait" error, which would
  // also reveal that the account exists).
  const existing = await prisma.passwordReset.findUnique({ where: { userId: user.id } });
  if (existing && (Date.now() - existing.sentAt.getTime()) / 1000 < env.OTP_RESEND_COOLDOWN_SECONDS) {
    return answer;
  }

  const code = generateCode();
  const now = new Date();
  const data = {
    codeHash: hashCode(resetKey(user.id), code),
    expiresAt: new Date(now.getTime() + env.OTP_TTL_MINUTES * 60_000),
    attempts: 0,
    sentAt: now,
  };
  await prisma.passwordReset.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
  });

  try {
    await sendMail({
      to: user.email,
      ...verificationEmail({
        name: user.name,
        email: user.email,
        code,
        ttlMinutes: env.OTP_TTL_MINUTES,
        purpose: 'password-reset',
      }),
    });
  } catch (error) {
    console.error('Failed to send password reset email', error);
    await prisma.passwordReset.deleteMany({ where: { userId: user.id } });
  }
  return answer;
}

/**
 * Checks the code and sets the new password. The attempt counter is incremented atomically
 * before comparing, so parallel guesses cannot exceed the limit. A correct code is single use.
 * Every session of the user ends, so anyone holding the old password is signed out.
 */
export async function resetPassword(input: {
  email: string;
  otp: string;
  newPassword: string;
}): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, isActive: true, emailVerifiedAt: true },
  });
  // Unknown and deactivated accounts get the same answer as a wrong code.
  if (!user || !user.isActive) throw codeError(INVALID);

  const record = await prisma.passwordReset.findUnique({ where: { userId: user.id } });
  if (!record) throw codeError(INVALID);

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.passwordReset.deleteMany({ where: { userId: user.id } });
    throw codeError(INVALID);
  }

  const { attempts } = await prisma.passwordReset.update({
    where: { userId: user.id },
    data: { attempts: { increment: 1 } },
    select: { attempts: true },
  });
  if (attempts > env.OTP_MAX_ATTEMPTS) {
    await prisma.passwordReset.deleteMany({ where: { userId: user.id } });
    throw codeError('Too many incorrect attempts. Request a new code.');
  }

  if (!safeEqual(record.codeHash, hashCode(resetKey(user.id), input.otp))) {
    const remaining = env.OTP_MAX_ATTEMPTS - attempts;
    throw codeError(
      remaining > 0
        ? `Incorrect code. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} left.`
        : 'Too many incorrect attempts. Request a new code.',
    );
  }

  const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      // Receiving the code proves the mailbox, so an account that never finished verifying is
      // verified by this as well.
      data: { passwordHash, ...(user.emailVerifiedAt ? {} : { emailVerifiedAt: new Date() }) },
    }),
    prisma.passwordReset.deleteMany({ where: { userId: user.id } }),
    prisma.emailVerification.deleteMany({ where: { userId: user.id } }),
  ]);
  await endAllSessions(user.id);
  return user.id;
}
