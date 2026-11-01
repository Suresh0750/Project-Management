import bcrypt from 'bcryptjs';
import { Role, type Prisma } from '@prisma/client';
import { prisma } from '../../../prisma/client.js';
import { HttpError } from '../../utils/httpError.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../utils/jwt.js';
import { env } from '../../config/env.js';
import { SAFE_USER_SELECT } from '../../constants.js';
import { consumeOtp, issueOtp } from './otp.service.js';
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  VerifyEmailInput,
} from './auth.validation.js';

const SALT_ROUNDS = 12;
// Real bcrypt hash so unknown-email logins cost the same as wrong-password ones
const DUMMY_HASH = bcrypt.hashSync('timing-safe-placeholder', SALT_ROUNDS);

const NOT_VERIFIED_CODE = 'EMAIL_NOT_VERIFIED';

// ─── Register ────────────────────────────────────────────────────────────────
// Public registration always creates an unverified MEMBER and emails a one-time code. No
// session is issued until the email is verified. Admin/PM accounts are created by an
// administrator through the user-management module, already verified.
export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing?.emailVerifiedAt) {
    const message = 'Email address is already registered';
    throw new HttpError(409, message, [{ path: 'email', message }]);
  }

  // A pending (unverified) account is left exactly as it was created: re-submitting the form
  // only re-sends the code. Overwriting the credentials would let anyone who knows a pending
  // address swap in their own password before the real owner verifies.
  const user =
    existing ??
    (await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await bcrypt.hash(input.password, SALT_ROUNDS),
        role: Role.MEMBER,
        emailVerifiedAt: null,
      },
      select: { id: true, name: true, email: true },
    }));

  const { resendAfterSeconds } = await issueOtp(user);
  return { email: user.email, resendAfterSeconds };
}

// ─── Verify email (OTP) ───────────────────────────────────────────────────────
export async function verifyEmail(input: VerifyEmailInput) {
  const invalid = () =>
    new HttpError(400, 'The code is invalid or has expired. Request a new one.', [
      { path: 'otp', message: 'The code is invalid or has expired. Request a new one.' },
    ]);

  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Unknown and already-verified accounts get the same answer as a wrong code.
  if (!user || user.emailVerifiedAt) throw invalid();
  if (!user.isActive) {
    throw new HttpError(403, 'Your account has been deactivated. Please contact an administrator');
  }

  await consumeOtp(user.id, input.otp);

  const verified = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date() },
    select: { ...SAFE_USER_SELECT, tokenVersion: true },
  });

  // Proving the mailbox is the sign-in, so the user lands in the app without logging in again.
  const { tokenVersion, ...safeUser } = verified;
  const accessToken = signAccessToken({
    sub: safeUser.id,
    email: safeUser.email,
    role: safeUser.role,
    tokenVersion,
  });
  const refreshToken = signRefreshToken(safeUser.id, tokenVersion);

  return { user: safeUser, accessToken, refreshToken };
}

// ─── Resend OTP ───────────────────────────────────────────────────────────────
// Always answers the same way for unknown or already-verified addresses, so the endpoint
// cannot be used to discover which emails have accounts.
export async function resendOtp(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, emailVerifiedAt: true, isActive: true },
  });

  if (!user || user.emailVerifiedAt || !user.isActive) {
    return { resendAfterSeconds: env.OTP_RESEND_COOLDOWN_SECONDS };
  }
  return issueOtp(user);
}

// ─── Login ────────────────────────────────────────────────────────────────────
export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Use a constant-time comparison path even on not-found to prevent timing attacks
  const hash = user?.passwordHash ?? DUMMY_HASH;
  const isValid = await bcrypt.compare(input.password, hash);

  if (!user || !isValid) {
    throw new HttpError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new HttpError(403, 'Your account has been deactivated. Please contact an administrator');
  }

  // Correct password but unverified email: send a fresh code (if the cooldown allows) and tell
  // the client to continue on the verification screen.
  if (!user.emailVerifiedAt) {
    await issueOtp(user).catch((error: unknown) => {
      if (!(error instanceof HttpError && error.statusCode === 429)) {
        console.error('Could not send verification code during login', error);
      }
    });
    throw new HttpError(403, 'Please verify your email address to continue', [
      { path: 'code', message: NOT_VERIFIED_CODE },
    ]);
  }

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });
  const refreshToken = signRefreshToken(user.id, user.tokenVersion);

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return { user: safeUser, accessToken, refreshToken };
}

// ─── Refresh ──────────────────────────────────────────────────────────────────
export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new HttpError(401, 'Invalid or expired refresh token');
  }

  const record = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { ...SAFE_USER_SELECT, tokenVersion: true },
  });

  if (!record) throw new HttpError(401, 'User not found');
  if (!record.isActive) throw new HttpError(403, 'Account is deactivated');
  if (!record.emailVerifiedAt) throw new HttpError(403, 'Email address is not verified');
  if (payload.tv !== record.tokenVersion) throw new HttpError(401, 'Session has been revoked');

  const { tokenVersion, ...user } = record;
  const newAccessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    tokenVersion,
  });
  const newRefreshToken = signRefreshToken(user.id, tokenVersion);

  return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
}

// ─── Logout ───────────────────────────────────────────────────────────────────
// Bumping tokenVersion invalidates all access and refresh tokens for the user.
export async function logout(accessToken?: string, refreshToken?: string): Promise<void> {
  const userId = identifyUser(accessToken, refreshToken);
  if (!userId) return; // nothing valid to revoke; cookies are cleared by the caller

  await prisma.user.updateMany({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}

function identifyUser(accessToken?: string, refreshToken?: string): string | undefined {
  if (accessToken) {
    try {
      return verifyAccessToken(accessToken).sub;
    } catch {
      // expired or invalid — fall through to the refresh token
    }
  }
  if (refreshToken) {
    try {
      return verifyRefreshToken(refreshToken).sub;
    } catch {
      // invalid refresh token — nothing to revoke
    }
  }
  return undefined;
}

// ─── Me ───────────────────────────────────────────────────────────────────────
export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: SAFE_USER_SELECT,
  });

  if (!user) throw new HttpError(404, 'User not found');
  if (!user.isActive) throw new HttpError(403, 'Account is deactivated');

  return user;
}

// ─── Profile ──────────────────────────────────────────────────────────────────
// A wrong current password is a 400 (not 401): a 401 means "session expired" to the client
// and would sign the user out for a simple typo.
function wrongPassword(): HttpError {
  const message = 'Current password is incorrect';
  return new HttpError(400, message, [{ path: 'currentPassword', message }]);
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!current) throw new HttpError(404, 'User not found');

  const emailChanged = input.email !== undefined && input.email !== current.email;
  if (emailChanged) {
    if (!input.currentPassword) {
      const message = 'Enter your current password to change your email';
      throw new HttpError(400, message, [{ path: 'currentPassword', message }]);
    }
    if (!(await bcrypt.compare(input.currentPassword, current.passwordHash))) throw wrongPassword();

    const taken = await prisma.user.findFirst({
      where: { email: input.email as string, NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) {
      const message = 'Email address is already in use';
      throw new HttpError(409, message, [{ path: 'email', message }]);
    }
  }

  const data: Prisma.UserUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (emailChanged && input.email !== undefined) data.email = input.email;

  try {
    return await prisma.user.update({ where: { id: userId }, data, select: SAFE_USER_SELECT });
  } catch (err) {
    // Two concurrent requests can both pass the check above; the unique index decides.
    if (typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2002') {
      const message = 'Email address is already in use';
      throw new HttpError(409, message, [{ path: 'email', message }]);
    }
    throw err;
  }
}

// ─── Change password ──────────────────────────────────────────────────────────
// Bumping tokenVersion signs the user out everywhere else; the caller gets fresh tokens so
// the current session stays signed in.
export async function changePassword(userId: string, input: ChangePasswordInput) {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!current) throw new HttpError(404, 'User not found');

  if (!(await bcrypt.compare(input.currentPassword, current.passwordHash))) throw wrongPassword();

  const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, tokenVersion: { increment: 1 } },
    select: { ...SAFE_USER_SELECT, tokenVersion: true },
  });

  const { tokenVersion, ...user } = updated;
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    tokenVersion,
  });
  const refreshToken = signRefreshToken(user.id, tokenVersion);

  return { user, accessToken, refreshToken };
}
