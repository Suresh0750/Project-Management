import bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../../prisma/client.js';
import { HttpError } from '../../utils/httpError.js';
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
  return user;
}

// ─── Create user (Admin only) ─────────────────────────────────────────────────
export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new HttpError(409, 'Email address is already registered');

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
    },
    select: SAFE_USER_SELECT,
  });

  return user;
}

// ─── Update user ──────────────────────────────────────────────────────────────
export async function updateUser(id: string, input: UpdateUserInput) {
  await assertUserExists(id);

  // If email is being changed, ensure it isn't taken
  if (input.email) {
    const conflict = await prisma.user.findFirst({
      where: { email: input.email, NOT: { id } },
    });
    if (conflict) throw new HttpError(409, 'Email address is already in use');
  }

  // Strip undefined so exactOptionalPropertyTypes doesn't conflict with Prisma's update input
  const data: Record<string, string> = {};
  if (input.name !== undefined) data['name'] = input.name;
  if (input.email !== undefined) data['email'] = input.email;

  const user = await prisma.user.update({
    where: { id },
    data,
    select: SAFE_USER_SELECT,
  });

  return user;
}

// ─── Update user status (activate / deactivate) ───────────────────────────────
export async function updateUserStatus(id: string, isActive: boolean, requesterId: string) {
  await assertUserExists(id);

  // Prevent self-deactivation
  if (id === requesterId && !isActive) {
    throw new HttpError(400, 'You cannot deactivate your own account');
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isActive },
    select: SAFE_USER_SELECT,
  });

  return user;
}

// ─── Internal helper ──────────────────────────────────────────────────────────
async function assertUserExists(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) throw new HttpError(404, 'User not found');
}
