import { Role, type Prisma } from '@prisma/client';
import type { AuthUser } from '../../types/express.js';

/**
 * Which tasks a user may see. ADMIN: all. PROJECT_MANAGER: tasks in projects they manage.
 * MEMBER: tasks in projects they belong to. Soft-deleted tasks are never visible.
 */
export function taskScope(user: AuthUser): Prisma.TaskWhereInput {
  switch (user.role) {
    case Role.ADMIN:
      return { deletedAt: null };
    case Role.PROJECT_MANAGER:
      return { deletedAt: null, project: { managerId: user.id } };
    case Role.MEMBER:
      return { deletedAt: null, project: { members: { some: { userId: user.id } } } };
  }
}

interface PermissionSubject {
  assigneeId: string | null;
  project: { managerId: string; archivedAt: Date | null };
}

export interface TaskPermissions {
  /** Any edit at all (members: description only). */
  canEdit: boolean;
  canEditAllFields: boolean;
  canAssign: boolean;
  canDelete: boolean;
  canChangeStatus: boolean;
  canComment: boolean;
}

export function manages(user: AuthUser, project: { managerId: string }): boolean {
  return user.role === Role.ADMIN || (user.role === Role.PROJECT_MANAGER && project.managerId === user.id);
}

/**
 * Single source of truth for task permissions. Archived projects are read-only for everyone.
 * Members may only work on tasks assigned to them (status + description) and comment.
 */
export function permissionsFor(user: AuthUser, task: PermissionSubject): TaskPermissions {
  const writable = task.project.archivedAt === null;
  const canManage = writable && manages(user, task.project);
  const isAssignee = writable && user.role === Role.MEMBER && task.assigneeId === user.id;

  return {
    canEdit: canManage || isAssignee,
    canEditAllFields: canManage,
    canAssign: canManage,
    canDelete: canManage,
    canChangeStatus: canManage || isAssignee,
    canComment: writable,
  };
}
