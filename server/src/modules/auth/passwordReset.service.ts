import bcrypt from 'bcryptjs';
import { prisma } from '../../../prisma/client.js';
import { env } from '../../config/env.js';
import { HttpError } from '../../utils/httpError.js';
import { consumeOtp, issueOtp } from './otp.service.js';
import { endAllSessions } from './session.service.js';

const SALT_ROUNDS = 12;
const INVALID = 'The code is invalid or has expired. Request a new one.';

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

  // `quiet`: inside the cooldown, or if the email fails, answer normally (no "please wait" or
  // "could not send" error, which would also reveal that the account exists).
  return issueOtp(user, 'PASSWORD_RESET', { quiet: true });
}

/**
 * Checks the code and sets the new password. Every session of the user ends, so anyone holding
 * the old password is signed out.
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
  if (!user || !user.isActive) {
    throw new HttpError(400, INVALID, [{ path: 'otp', message: INVALID }]);
  }

  await consumeOtp(user.id, 'PASSWORD_RESET', input.otp);

  const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      // Receiving the code proves the mailbox, so an account that never finished verifying is
      // verified by this as well.
      data: { passwordHash, ...(user.emailVerifiedAt ? {} : { emailVerifiedAt: new Date() }) },
    }),
    // A pending sign-up code is no longer needed once the email is verified.
    prisma.otpCode.deleteMany({ where: { userId: user.id, purpose: 'SIGNUP' } }),
  ]);
  await endAllSessions(user.id);
  return user.id;
}
