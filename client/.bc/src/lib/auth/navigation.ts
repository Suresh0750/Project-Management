import {
  Activity,
  Bell,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/types/auth';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrator',
  PROJECT_MANAGER: 'Project Manager',
  MEMBER: 'Member',
};

// URL segment each role owns. Everything under it is that role's area.
export const ROLE_BASE_PATH: Record<Role, string> = {
  ADMIN: '/admin',
  PROJECT_MANAGER: '/manager',
  MEMBER: '/member',
};

/**
 * Single source of truth for what each role sees in the sidebar.
 * Hiding a link is a UX convenience only; the backend still enforces access.
 */
export function getNavItems(role: Role): NavItem[] {
  const base = ROLE_BASE_PATH[role];
  const item = (label: string, path: string, icon: LucideIcon): NavItem => ({
    label,
    href: `${base}/${path}`,
    icon,
  });

  switch (role) {
    case 'ADMIN':
      return [
        item('Dashboard', 'dashboard', LayoutDashboard),
        item('Users', 'users', Users),
        item('Projects', 'projects', FolderKanban),
        item('Tasks', 'tasks', ListChecks),
        item('Activity', 'activity', Activity),
        item('Notifications', 'notifications', Bell),
        item('Settings', 'settings', Settings),
      ];
    case 'PROJECT_MANAGER':
      return [
        item('Dashboard', 'dashboard', LayoutDashboard),
        item('My Projects', 'projects', FolderKanban),
        item('Tasks', 'tasks', ListChecks),
        item('Activity', 'activity', Activity),
        item('Notifications', 'notifications', Bell),
        item('Settings', 'settings', Settings),
      ];
    case 'MEMBER':
      return [
        item('Dashboard', 'dashboard', LayoutDashboard),
        item('My Projects', 'projects', FolderKanban),
        item('My Tasks', 'tasks', ListChecks),
        item('Activity', 'activity', Activity),
        item('Notifications', 'notifications', Bell),
        item('Settings', 'settings', Settings),
      ];
  }
}

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
