import bcrypt from 'bcryptjs';
import { Role, type Prisma } from '@prisma/client';
import { prisma } from '../../../prisma/client.js';
import { env } from '../../config/env.js';
import { disconnectUserSockets } from '../../realtime/socket.js';
import { consumeOtp, issueOtp } from '../auth/otp.service.js';
import { endAllSessions } from '../auth/session.service.js';
import { HttpError } from '../../utils/httpError.js';
import { accountStatusEmail } from '../../utils/emailTemplates.js';
import { sendMail } from '../../utils/mailer.js';
import { SAFE_USER_SELECT, DEFAULT_PAGE, DEFAULT_LIMIT } from '../../constants.js';
import type {
  CreateUserInput,
  UpdateUserInput,
  ListUsersQuery,
} from './users.validation.js';

const SALT_ROUNDS = 12;

// ─── List users (Admin only) ──────────────────────────────────────────────────
export async function listUsers(query: ListUsersQuery) {
  const page = query.page ?? DEFAULT_PAGE;
  const limit = query.limit ?? DEFAULT_LIMIT;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};

  if (query.search) {
    where.OR = [
      { name: { contains: query.search } },
      { email: { contains: query.search } },
    ];
  }

  if (query.role) where.role = query.role;
  if (query.isActive !== undefined) where.isActive = query.isActive;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: SAFE_USER_SELECT,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── Get single user ──────────────────────────────────────────────────────────
export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: SAFE_USER_SELECT,
  });

  if (!user) throw new HttpError(404, 'User not found');
  return { ...user, pendingEmail: await findPendingEmail(id) };
}

/** The new address an administrator started changing to, while its code is still valid. */
async function findPendingEmail(userId: string): Promise<string | null> {
  const pending = await prisma.emailVerification.findUnique({
    where: { userId },
    select: { newEmail: true, expiresAt: true },
  });
  return pending?.newEmail && pending.expiresAt.getTime() > Date.now() ? pending.newEmail : null;
}

// ─── Create user (Admin only) ─────────────────────────────────────────────────
export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new HttpError(409, 'Email address is already registered');

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  try {
    return await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        // An administrator vouches for accounts they create, so no email verification is needed.
        emailVerifiedAt: new Date(),
      },
      select: SAFE_USER_SELECT,
    });
  } catch (err) {
    // Two concurrent requests can both pass the check above; the unique index decides.
    if (isUniqueViolation(err)) throw new HttpError(409, 'Email address is already registered');
    throw err;
  }
}

// ─── Update user ──────────────────────────────────────────────────────────────
// Name and role apply at once. A changed email does NOT: for an account with a verified email
// the new address gets a one-time code and only replaces the old one when that code is entered
// (see confirmEmailChange). Creating a user needs no code, because the administrator vouches for it.
export async function updateUser(id: string, input: UpdateUserInput, requesterId: string) {
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, emailVerifiedAt: true },
  });
  if (!target) throw new HttpError(404, 'User not found');

  if (input.role !== undefined && input.role !== target.role) {
    if (id === requesterId) throw new HttpError(400, 'You cannot change your own role');
    if (target.role === Role.ADMIN) {
      throw new HttpError(403, 'Administrator roles cannot be changed');
    }
  }

  const emailChanged = input.email !== undefined && input.email !== target.email;
  if (emailChanged) {
    const conflict = await prisma.user.findFirst({
      where: { email: input.email as string, NOT: { id } },
    });
    if (conflict) throw new HttpError(409, 'Email address is already in use');
  }

  // Unverified accounts have no confirmed address yet, so there is nothing to protect: the new
  // address is used directly and verified through the normal sign-in code.
  const needsCode = emailChanged && target.emailVerifiedAt !== null;

  // Send the code first: if the mail cannot be sent, nothing else is changed.
  let emailChange: { newEmail: string; resendAfterSeconds: number } | null = null;
  if (needsCode) {
    const newEmail = input.email as string;
    const { resendAfterSeconds } = await issueOtp(
      { id, name: input.name ?? target.name, email: target.email },
      newEmail,
    );
    emailChange = { newEmail, resendAfterSeconds };
  }

  const data: Prisma.UserUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (emailChanged && !needsCode) data.email = input.email as string;
  if (input.role !== undefined) data.role = input.role;

  // Changing the email back to the current one cancels a change that was waiting for its code.
  if (input.email !== undefined && !emailChanged) await cancelPendingEmail(id);

  try {
    const user =
      Object.keys(data).length > 0
        ? await prisma.user.update({ where: { id }, data, select: SAFE_USER_SELECT })
        : await prisma.user.findUniqueOrThrow({ where: { id }, select: SAFE_USER_SELECT });
    const pendingEmail = emailChange?.newEmail ?? (await findPendingEmail(id));
    return { user: { ...user, pendingEmail }, emailChange };
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'Email address is already in use');
    throw err;
  }
}

async function cancelPendingEmail(userId: string): Promise<void> {
  await prisma.emailVerification.deleteMany({ where: { userId, newEmail: { not: null } } });
}

async function requirePendingEmail(id: string) {
  const pending = await prisma.emailVerification.findUnique({
    where: { userId: id },
    select: { newEmail: true },
  });
  if (!pending?.newEmail) {
    throw new HttpError(400, 'There is no email change waiting for a code. Start it by editing the email.');
  }
  return pending.newEmail;
}

/** The administrator enters the code that was sent to the new address; only now does it change. */
export async function confirmEmailChange(id: string, otp: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!user) throw new HttpError(404, 'User not found');
  await requirePendingEmail(id);

  const { newEmail } = await consumeOtp(id, otp);
  if (!newEmail) throw new HttpError(400, 'There is no email change waiting for a code.');

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { email: newEmail },
      select: SAFE_USER_SELECT,
    });
    return { ...updated, pendingEmail: null };
  } catch (err) {
    // Someone took the address while the code was pending.
    if (isUniqueViolation(err)) throw new HttpError(409, 'Email address is already in use');
    throw err;
  }
}

export async function resendEmailChangeCode(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true },
  });
  if (!user) throw new HttpError(404, 'User not found');
  const newEmail = await requirePendingEmail(id);

  const { resendAfterSeconds } = await issueOtp(user, newEmail);
  return { newEmail, resendAfterSeconds };
}

export async function cancelEmailChange(id: string): Promise<void> {
  await assertUserExists(id);
  await cancelPendingEmail(id);
}

// ─── Update user status (activate / deactivate) ───────────────────────────────
export async function updateUserStatus(id: string, isActive: boolean, requesterId: string) {
  const before = await prisma.user.findUnique({ where: { id }, select: { isActive: true } });
  if (!before) throw new HttpError(404, 'User not found');

  // Prevent self-deactivation
  if (id === requesterId && !isActive) {
    throw new HttpError(400, 'You cannot deactivate your own account');
  }

  const user = await prisma.user.update({
    where: { id },
    // Deactivating also revokes every outstanding access/refresh token.
    data: isActive ? { isActive } : { isActive, tokenVersion: { increment: 1 } },
    select: SAFE_USER_SELECT,
  });

  if (before.isActive !== isActive) {
    // Open tabs and devices learn about it immediately instead of on their next click.
    if (!isActive) {
      await endAllSessions(id);
      disconnectUserSockets(id);
    }

    // Best effort and off the request path: a slow or failing mail server must never undo or
    // delay the administrator's action.
    void sendMail({
      to: user.email,
      ...accountStatusEmail({
        name: user.name,
        email: user.email,
        active: isActive,
        supportEmail: env.SUPPORT_EMAIL,
      }),
    }).catch((error: unknown) => {
      console.error('Could not send the account status email', error);
    });
  }

  return user;
}

// ─── Internal helper ──────────────────────────────────────────────────────────
async function assertUserExists(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) throw new HttpError(404, 'User not found');
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2002';
}
