import type { Role } from './api';

// One table for how roles read in the UI, so every screen names them the same way.

export const ROLES: Role[] = ['SUPER_ADMIN', 'EDITOR', 'AUTHOR', 'CONTRIBUTOR'];

export const ROLE_NAME: Record<Role, string> = {
  SUPER_ADMIN: 'Super admin',
  EDITOR: 'Editor',
  AUTHOR: 'Author',
  CONTRIBUTOR: 'Contributor',
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  SUPER_ADMIN: 'Full access. Manages users, roles, and site settings.',
  EDITOR: 'Reviews, edits, and publishes any post. Manages categories.',
  AUTHOR: 'Creates, edits, and publishes their own posts.',
  CONTRIBUTOR: 'Writes drafts. An editor or admin must approve and publish.',
};

export const ROLE_DOT: Record<Role, string> = {
  SUPER_ADMIN: 'bg-accent',
  EDITOR: 'bg-info',
  AUTHOR: 'bg-success',
  CONTRIBUTOR: 'bg-content-tertiary',
};

export const canManageUsers = (role: Role | undefined) =>
  role === 'SUPER_ADMIN' || role === 'EDITOR';
