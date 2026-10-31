import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../../../prisma/client.js';
import { HttpError } from '../../utils/httpError.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../utils/jwt.js';
import { SAFE_USER_SELECT } from '../../constants.js';
import type { RegisterInput, LoginInput } from './auth.validation.js';

const SALT_ROUNDS = 12;
// Real bcrypt hash so unknown-email logins cost the same as wrong-password ones
const DUMMY_HASH = bcrypt.hashSync('timing-safe-placeholder', SALT_ROUNDS);

// ─── Register ────────────────────────────────────────────────────────────────
// Public registration always creates MEMBER accounts.
// Admin/PM creation goes through the user-management module.
export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new HttpError(409, 'Email address is already registered');

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: Role.MEMBER,
    },
    select: SAFE_USER_SELECT,
  });

  // New accounts start at tokenVersion 0 (schema default)
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: 0,
  });
  const refreshToken = signRefreshToken(user.id, 0);

  return { user, accessToken, refreshToken };
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
