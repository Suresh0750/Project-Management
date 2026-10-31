import { Role, type Prisma } from '@prisma/client';
import { prisma } from '../../../prisma/client.js';
import { SAFE_USER_SELECT } from '../../constants.js';
import { HttpError } from '../../utils/httpError.js';
import type { AuthUser } from '../../types/express.js';
import { Outbox } from '../../realtime/outbox.js';
import { recordActivity } from '../activity/activity.service.js';
import { notifyUsers } from '../notifications/notification.service.js';
import {
  deadlineBeforeStart,
  type CreateProjectInput,
  type ListProjectsQuery,
  type MemberCandidatesQuery,
  type ProjectActivitiesQuery,
  type UpdateProjectInput,
} from './projects.validation.js';

const PERSON_SELECT = { id: true, name: true, email: true } as const;
const DEADLINE_MESSAGE = 'Deadline cannot be earlier than the start date';

const projectInclude = {
  manager: { select: PERSON_SELECT },
  _count: { select: { members: true, tasks: { where: { deletedAt: null } } } },
} satisfies Prisma.ProjectInclude;

type ProjectRow = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

// ─── Access rules ─────────────────────────────────────────────────────────────
// ADMIN sees everything; a PROJECT_MANAGER only the projects they manage; a MEMBER only
// the projects they belong to. Anything else is reported as "not found" so the existence
// of other projects is never revealed.
function accessScope(user: AuthUser): Prisma.ProjectWhereInput {
  switch (user.role) {
    case Role.ADMIN:
      return {};
    case Role.PROJECT_MANAGER:
      return { managerId: user.id };
    case Role.MEMBER:
      return { members: { some: { userId: user.id } } };
  }
}

function canManage(user: AuthUser, project: { managerId: string }): boolean {
  return user.role === Role.ADMIN || (user.role === Role.PROJECT_MANAGER && project.managerId === user.id);
}

async function findAccessible(user: AuthUser, id: string) {
  const project = await prisma.project.findFirst({
    where: { id, ...accessScope(user) },
    include: projectInclude,
  });
  if (!project) throw new HttpError(404, 'Project not found');
  return project;
}

async function findManageable(user: AuthUser, id: string) {
  const project = await findAccessible(user, id);
  if (!canManage(user, project)) {
    throw new HttpError(403, 'You do not have permission to manage this project');
  }
  return project;
}

function assertNotArchived(project: { archivedAt: Date | null }): void {
  if (project.archivedAt) throw new HttpError(400, 'Archived projects cannot be modified');
}

function fieldError(status: number, path: string, message: string): HttpError {
  return new HttpError(status, message, [{ path, message }]);
}

// ─── Mapping ──────────────────────────────────────────────────────────────────
async function completedCounts(projectIds: string[]): Promise<Map<string, number>> {
  if (projectIds.length === 0) return new Map();
  const groups = await prisma.task.groupBy({
    by: ['projectId'],
    where: { projectId: { in: projectIds }, deletedAt: null, status: 'COMPLETED' },
    _count: { _all: true },
  });
  return new Map(groups.map((group) => [group.projectId, group._count._all]));
}

function toSummary(project: ProjectRow, completedTaskCount: number) {
  const taskCount = project._count.tasks;
  const { _count, ...rest } = project;
  return {
    ...rest,
    memberCount: _count.members,
    taskCount,
    completedTaskCount,
    progress: taskCount === 0 ? 0 : Math.round((completedTaskCount / taskCount) * 100),
  };
}

async function toDetail(user: AuthUser, project: ProjectRow) {
  const [completed, members] = await Promise.all([
    completedCounts([project.id]),
    prisma.projectMember.findMany({
      where: { projectId: project.id },
      orderBy: { joinedAt: 'asc' },
      select: { joinedAt: true, user: { select: SAFE_USER_SELECT } },
    }),
  ]);

  return {
    ...toSummary(project, completed.get(project.id) ?? 0),
    members: members.map((member) => ({ ...member.user, joinedAt: member.joinedAt })),
    canManage: canManage(user, project),
  };
}

// ─── List ─────────────────────────────────────────────────────────────────────
export async function listProjects(user: AuthUser, query: ListProjectsQuery) {
  const where: Prisma.ProjectWhereInput = {
    ...accessScope(user),
    archivedAt: query.archived ? { not: null } : null,
  };
  if (query.search) where.name = { contains: query.search };
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;

  const skip = (query.page - 1) * query.limit;
  const [projects, total] = await prisma.$transaction([
    prisma.project.findMany({
      where,
      include: projectInclude,
      skip,
      take: query.limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.project.count({ where }),
  ]);

  const completed = await completedCounts(projects.map((project) => project.id));

  return {
    projects: projects.map((project) => toSummary(project, completed.get(project.id) ?? 0)),
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

// ─── Detail ───────────────────────────────────────────────────────────────────
export async function getProject(user: AuthUser, id: string) {
  return toDetail(user, await findAccessible(user, id));
}

// ─── Create ───────────────────────────────────────────────────────────────────
async function resolveManagerId(user: AuthUser, requested: string | undefined): Promise<string> {
  if (user.role === Role.PROJECT_MANAGER) {
    if (requested && requested !== user.id) {
      throw new HttpError(403, 'Project Managers can only create projects for themselves');
    }
    return user.id;
  }

  if (!requested) throw fieldError(400, 'managerId', 'Select a Project Manager');
  await assertValidManager(requested);
  return requested;
}

async function assertValidManager(managerId: string): Promise<void> {
  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    select: { role: true, isActive: true },
  });
  if (!manager || manager.role !== Role.PROJECT_MANAGER || !manager.isActive) {
    throw fieldError(400, 'managerId', 'Select an active Project Manager');
  }
}

export async function createProject(user: AuthUser, input: CreateProjectInput) {
  const managerId = await resolveManagerId(user, input.managerId);
  const outbox = new Outbox();

  const created = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        priority: input.priority,
        status: input.status,
        startDate: input.startDate ?? null,
        deadline: input.deadline ?? null,
        managerId,
        createdById: user.id,
      },
      select: { id: true },
    });

    await recordActivity(tx, {
      action: 'PROJECT_CREATED',
      message: `${user.name} created project "${input.name}"`,
      actorId: user.id,
      projectId: project.id,
    });
    return project;
  });

  outbox.addRoomJoin(managerId, created.id);
  outbox.addProjectEvent(created.id, 'project:updated');
  outbox.flush();

  return getProject(user, created.id);
}

// ─── Update ───────────────────────────────────────────────────────────────────
export async function updateProject(user: AuthUser, id: string, input: UpdateProjectInput) {
  const project = await findManageable(user, id);
  assertNotArchived(project);

  if (input.managerId !== undefined && input.managerId !== project.managerId) {
    if (user.role !== Role.ADMIN) {
      throw new HttpError(403, 'Only administrators can reassign the Project Manager');
    }
    await assertValidManager(input.managerId);
  }

  // Dates may be updated one at a time, so validate the merged result.
  const merged = {
    startDate: input.startDate !== undefined ? input.startDate : project.startDate,
    deadline: input.deadline !== undefined ? input.deadline : project.deadline,
  };
  if (deadlineBeforeStart(merged)) throw fieldError(400, 'deadline', DEADLINE_MESSAGE);

  const data: Prisma.ProjectUncheckedUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.status !== undefined) data.status = input.status;
  if (input.startDate !== undefined) data.startDate = input.startDate;
  if (input.deadline !== undefined) data.deadline = input.deadline;
  if (input.managerId !== undefined) data.managerId = input.managerId;

  const outbox = new Outbox();
  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id }, data });
    await recordActivity(tx, {
      action: 'PROJECT_UPDATED',
      message: `${user.name} updated project "${input.name ?? project.name}"`,
      actorId: user.id,
      projectId: id,
      metadata: { fields: Object.keys(data) },
    });
  });

  if (input.managerId !== undefined && input.managerId !== project.managerId) {
    outbox.addRoomJoin(input.managerId, id);
    outbox.addRoomLeave(project.managerId, id);
  }
  outbox.addProjectEvent(id, 'project:updated');
  outbox.flush();

  return getProject(user, id);
}

// ─── Archive / restore ────────────────────────────────────────────────────────
export async function setProjectArchived(user: AuthUser, id: string, archived: boolean) {
  const project = await findManageable(user, id);

  if (Boolean(project.archivedAt) !== archived) {
    const outbox = new Outbox();
    await prisma.$transaction(async (tx) => {
      await tx.project.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
      await recordActivity(tx, {
        action: archived ? 'PROJECT_ARCHIVED' : 'PROJECT_UPDATED',
        message: `${user.name} ${archived ? 'archived' : 'restored'} project "${project.name}"`,
        actorId: user.id,
        projectId: id,
      });
    });
    outbox.addProjectEvent(id, 'project:updated');
    outbox.flush();
  }

  return getProject(user, id);
}

// ─── Members ──────────────────────────────────────────────────────────────────
export async function addMember(user: AuthUser, id: string, userId: string) {
  const project = await findManageable(user, id);
  assertNotArchived(project);

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, isActive: true },
  });
  if (!target || target.role !== Role.MEMBER || !target.isActive) {
    throw fieldError(400, 'userId', 'Only active Members can be added to a project');
  }

  const outbox = new Outbox();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.projectMember.create({ data: { projectId: id, userId, addedById: user.id } });
      await recordActivity(tx, {
        action: 'MEMBER_ADDED',
        message: `${user.name} added ${target.name} to "${project.name}"`,
        actorId: user.id,
        projectId: id,
        metadata: { userId },
      });
      outbox.addNotifications(
        await notifyUsers(tx, [userId], user.id, {
          type: 'PROJECT_MEMBER_ADDED',
          message: `You were added to the project "${project.name}"`,
          projectId: id,
        }),
      );
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'User is already a member of this project');
    throw err;
  }

  outbox.addRoomJoin(userId, id);
  outbox.addProjectEvent(id, 'project:memberAdded', { userId });
  outbox.flush();

  return getProject(user, id);
}

export async function removeMember(user: AuthUser, id: string, userId: string) {
  const project = await findManageable(user, id);
  assertNotArchived(project);

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: id, userId } },
    select: { user: { select: { name: true } } },
  });
  if (!membership) throw new HttpError(404, 'This user is not a member of the project');

  const outbox = new Outbox();
  await prisma.$transaction(async (tx) => {
    await tx.projectMember.delete({ where: { projectId_userId: { projectId: id, userId } } });
    // A removed member can no longer hold tasks in this project.
    await tx.task.updateMany({
      where: { projectId: id, assigneeId: userId, deletedAt: null },
      data: { assigneeId: null, assignedById: null },
    });
    await recordActivity(tx, {
      action: 'MEMBER_REMOVED',
      message: `${user.name} removed ${membership.user.name} from "${project.name}"`,
      actorId: user.id,
      projectId: id,
      metadata: { userId },
    });
  });

  // The removed user hears about it first, then stops receiving this project's events.
  outbox.addProjectEvent(id, 'project:memberRemoved', { userId });
  outbox.addRoomLeave(userId, id);
  outbox.flush();

  return getProject(user, id);
}

export async function listMemberCandidates(
  user: AuthUser,
  id: string,
  query: MemberCandidatesQuery,
) {
  await findManageable(user, id);

  const where: Prisma.UserWhereInput = {
    role: Role.MEMBER,
    isActive: true,
    memberships: { none: { projectId: id } },
  };
  if (query.search) {
    where.OR = [{ name: { contains: query.search } }, { email: { contains: query.search } }];
  }

  return prisma.user.findMany({
    where,
    select: PERSON_SELECT,
    orderBy: { name: 'asc' },
    take: 20,
  });
}

// ─── Activity ─────────────────────────────────────────────────────────────────
export async function listProjectActivities(
  user: AuthUser,
  id: string,
  query: ProjectActivitiesQuery,
) {
  await findAccessible(user, id);

  const where: Prisma.ActivityWhereInput = { projectId: id };
  const [activities, total] = await prisma.$transaction([
    prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        action: true,
        message: true,
        createdAt: true,
        actor: { select: { id: true, name: true } },
      },
    }),
    prisma.activity.count({ where }),
  ]);

  return {
    activities,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2002';
}
