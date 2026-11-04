import { logError } from '../../utils/logger.js';
import bcrypt from 'bcryptjs';
import { ProjectStatus, Role, type Prisma } from '@prisma/client';
import { Outbox } from '../../realtime/outbox.js';
import { recordActivity } from '../activity/activity.service.js';
import { prisma } from '../../../prisma/client.js';
import { env } from '../../config/env.js';
import { disconnectUserSockets } from '../../realtime/socket.js';
import { consumeOtp, issueOtp } from '../auth/otp.service.js';
import { endAllSessions, markSessionsEnded } from '../auth/session.service.js';
import { ROLE_CHANGED_CODE } from '../../utils/accountErrors.js';
import { HttpError } from '../../utils/httpError.js';
import { accountStatusEmail, roleChangedEmail } from '../../utils/emailTemplates.js';
import { sendMail } from '../../utils/mailer.js';
import { SAFE_USER_SELECT, DEFAULT_PAGE, DEFAULT_LIMIT } from '../../constants.js';
import type {
  CreateUserInput,
  UpdateUserInput,
  ListUsersQuery,
} from './users.validation.js';

const SALT_ROUNDS = 12;

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrator',
  PROJECT_MANAGER: 'Project Manager',
  MEMBER: 'Member',
};

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
  const pending = await findPendingEmailChange(id);
  return {
    ...user,
    roleLockedReason: await roleChangeBlocker(user),
    projects: await projectsOf(user),
    pendingEmail: pending?.newEmail ?? null,
    // Seconds until another code may be requested, so a refresh does not restart the timer.
    emailChangeResendAfter: pending?.resendAfterSeconds ?? 0,
  };
}

/**
 * Why this person's role cannot be changed right now, or null when it can. Changing the role of
 * someone who is still working in the old role would leave projects without a manager, or tasks
 * and memberships a Project Manager is not allowed to hold:
 *   Project Manager -> Member : only when they manage no project (archived ones count)
 *   Member -> Project Manager : only when they are on no project and hold no task
 */
async function roleChangeBlocker(user: {
  id: string;
  name: string;
  role: Role;
}): Promise<string | null> {
  if (user.role === Role.PROJECT_MANAGER) {
    const managed = await prisma.project.count({ where: { managerId: user.id } });
    if (managed === 0) return null;
    return `${user.name} is the Project Manager of ${managed} ${managed === 1 ? 'project' : 'projects'}. Assign ${managed === 1 ? 'it' : 'them'} to another Project Manager before changing this role.`;
  }

  if (user.role === Role.MEMBER) {
    const [projects, tasks] = await Promise.all([
      prisma.projectMember.count({ where: { userId: user.id } }),
      prisma.task.count({ where: { assigneeId: user.id, deletedAt: null } }),
    ]);
    if (projects === 0 && tasks === 0) return null;
    const parts = [
      projects > 0 ? `is a member of ${projects} ${projects === 1 ? 'project' : 'projects'}` : null,
      tasks > 0 ? `has ${tasks} assigned ${tasks === 1 ? 'task' : 'tasks'}` : null,
    ].filter(Boolean);
    return `${user.name} ${parts.join(' and ')}. Remove them from every project and unassign their tasks before making them a Project Manager.`;
  }

  return null;
}

const PROJECT_REF_SELECT = {
  id: true,
  name: true,
  status: true,
  priority: true,
  archivedAt: true,
} as const;

/** Projects a Project Manager manages, or a Member belongs to (what the admin sees on the user page). */
async function projectsOf(user: { id: string; role: Role }) {
  if (user.role === Role.PROJECT_MANAGER) {
    return prisma.project.findMany({
      where: { managerId: user.id },
      select: PROJECT_REF_SELECT,
      orderBy: [{ archivedAt: { sort: 'asc', nulls: 'first' } }, { name: 'asc' }],
      take: 100,
    });
  }
  if (user.role === Role.MEMBER) {
    const memberships = await prisma.projectMember.findMany({
      where: { userId: user.id },
      select: { project: { select: PROJECT_REF_SELECT } },
      orderBy: { joinedAt: 'desc' },
      take: 100,
    });
    return memberships.map((membership) => membership.project);
  }
  return [];
}

/** The new address an administrator started changing to, while its code is still valid. */
async function findPendingEmailChange(
  userId: string,
): Promise<{ newEmail: string; resendAfterSeconds: number } | null> {
  const pending = await prisma.otpCode.findUnique({
    where: { userId_purpose: { userId, purpose: 'EMAIL_CHANGE' } },
    select: { newEmail: true, expiresAt: true, sentAt: true },
  });
  if (!pending?.newEmail || pending.expiresAt.getTime() <= Date.now()) return null;

  const elapsed = (Date.now() - pending.sentAt.getTime()) / 1000;
  return {
    newEmail: pending.newEmail,
    resendAfterSeconds: Math.max(0, Math.ceil(env.OTP_RESEND_COOLDOWN_SECONDS - elapsed)),
  };
}

async function findPendingEmail(userId: string): Promise<string | null> {
  return (await findPendingEmailChange(userId))?.newEmail ?? null;
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

  const roleChanged = input.role !== undefined && input.role !== target.role;
  if (roleChanged) {
    if (id === requesterId) throw new HttpError(400, 'You cannot change your own role');
    if (target.role === Role.ADMIN) {
      throw new HttpError(403, 'Administrator roles cannot be changed');
    }
    // Checked here, on the server, so the rule holds even if the form is bypassed. It runs before
    // anything else (including the email code) so a refused change leaves everything untouched.
    const blocker = await roleChangeBlocker(target);
    if (blocker) throw new HttpError(409, blocker, [{ path: 'role', message: blocker }]);
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
      'EMAIL_CHANGE',
      { newEmail },
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
    if (roleChanged) {
      // Sign the person out everywhere: their open pages and live connections were set up for the
      // old role. The sessions are tagged, so their next request explains why they were signed out.
      await markSessionsEnded(id, ROLE_CHANGED_CODE);
      disconnectUserSockets(id);

      // Best effort and off the request path, like the deactivation email.
      void sendMail({
        to: user.email,
        ...roleChangedEmail({
          name: user.name,
          email: user.email,
          oldRole: ROLE_LABEL[target.role],
          newRole: ROLE_LABEL[user.role],
        }),
      }).catch((error: unknown) => {
        logError('Could not send the role changed email', error);
      });
    }
    const roleLockedReason = await roleChangeBlocker(user);
    const projects = await projectsOf(user);
    return { user: { ...user, pendingEmail, roleLockedReason, projects }, emailChange };
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'Email address is already in use');
    throw err;
  }
}

async function cancelPendingEmail(userId: string): Promise<void> {
  await prisma.otpCode.deleteMany({ where: { userId, purpose: 'EMAIL_CHANGE' } });
}

async function requirePendingEmail(id: string) {
  const pending = await prisma.otpCode.findUnique({
    where: { userId_purpose: { userId: id, purpose: 'EMAIL_CHANGE' } },
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

  const { newEmail } = await consumeOtp(id, 'EMAIL_CHANGE', otp);
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

  const { resendAfterSeconds } = await issueOtp(user, 'EMAIL_CHANGE', { newEmail });
  return { newEmail, resendAfterSeconds };
}

export async function cancelEmailChange(id: string): Promise<void> {
  await assertUserExists(id);
  await cancelPendingEmail(id);
}

// ─── Update user status (activate / deactivate) ───────────────────────────────
export async function updateUserStatus(
  id: string,
  isActive: boolean,
  requesterId: string,
  options: { holdProjects?: boolean; requesterName?: string } = {},
) {
  const before = await prisma.user.findUnique({
    where: { id },
    select: { isActive: true, role: true },
  });
  if (!before) throw new HttpError(404, 'User not found');

  // Prevent self-deactivation
  if (id === requesterId && !isActive) {
    throw new HttpError(400, 'You cannot deactivate your own account');
  }

  // Optionally put the projects this Project Manager runs on hold, in the same transaction as the
  // deactivation. Finished (completed) and archived projects, and ones already on hold, are left alone.
  const holdProjects =
    options.holdProjects === true &&
    !isActive &&
    before.isActive &&
    before.role === Role.PROJECT_MANAGER;
  const outbox = new Outbox();
  let heldProjects = 0;

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: { isActive },
      select: SAFE_USER_SELECT,
    });

    if (holdProjects) {
      const projects = await tx.project.findMany({
        where: {
          managerId: id,
          archivedAt: null,
          status: { in: [ProjectStatus.PLANNING, ProjectStatus.ACTIVE] },
        },
        select: { id: true, name: true },
      });
      for (const project of projects) {
        await tx.project.update({ where: { id: project.id }, data: { status: ProjectStatus.ON_HOLD } });
        await recordActivity(tx, {
          action: 'PROJECT_UPDATED',
          message: `${options.requesterName ?? 'An administrator'} put "${project.name}" on hold because its Project Manager ${updated.name} was deactivated`,
          actorId: requesterId,
          projectId: project.id,
          metadata: { fields: ['status'], status: ProjectStatus.ON_HOLD },
        });
        outbox.addProjectEvent(project.id, 'project:updated');
      }
      heldProjects = projects.length;
    }
    return updated;
  });
  outbox.flush();

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
      logError('Could not send the account status email', error);
    });
  }

  return { user, heldProjects };
}

// ─── Internal helper ──────────────────────────────────────────────────────────
async function assertUserExists(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) throw new HttpError(404, 'User not found');
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2002';
}
