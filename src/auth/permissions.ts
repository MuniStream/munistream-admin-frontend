/**
 * Admin portal permissions, mirroring the backend access policy
 * (`app/auth/access_policy.py`). The backend is the real gate; these only decide
 * which menu entries, routes and buttons are shown, so that users never see
 * actions that would answer 403.
 *
 * Each role includes the previous one:
 *   viewer   see the instances of their teams (read only)
 *   reviewer + start, fill in and review
 *   approver + final approval and signature
 *   manager  + assign within their teams, analytics
 *   admin    + workflow definitions, catalogs, integrations, Keycloak
 *
 * A user with several roles gets the union of their permissions.
 */

export const PERMISSIONS = {
  VIEW_INSTANCES: 'view_instances',
  START_INSTANCES: 'start_instances',
  REVIEW_INSTANCES: 'review_instances',
  APPROVE_INSTANCES: 'approve_instances',
  ASSIGN_INSTANCES: 'assign_instances',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_WORKFLOWS: 'manage_workflows',
  MANAGE_INTEGRATIONS: 'manage_integrations',
  ADMIN_SYSTEM: 'admin_system',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const SYSTEM_ROLES = ['admin', 'manager', 'approver', 'reviewer', 'viewer'] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

const VIEWER: Permission[] = [PERMISSIONS.VIEW_INSTANCES];
const REVIEWER: Permission[] = [...VIEWER, PERMISSIONS.START_INSTANCES, PERMISSIONS.REVIEW_INSTANCES];
const APPROVER: Permission[] = [...REVIEWER, PERMISSIONS.APPROVE_INSTANCES];
const MANAGER: Permission[] = [...APPROVER, PERMISSIONS.ASSIGN_INSTANCES, PERMISSIONS.VIEW_ANALYTICS];
const ADMIN: Permission[] = [
  ...MANAGER,
  PERMISSIONS.MANAGE_WORKFLOWS,
  PERMISSIONS.MANAGE_INTEGRATIONS,
  PERMISSIONS.ADMIN_SYSTEM,
];

export const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  viewer: VIEWER,
  reviewer: REVIEWER,
  approver: APPROVER,
  manager: MANAGER,
  admin: ADMIN,
};

export function isSystemRole(role: string): role is SystemRole {
  return (SYSTEM_ROLES as readonly string[]).includes(role);
}

/** Union of the permissions of every system role in `roles`. */
export function permissionsForRoles(roles: string[]): Permission[] {
  const result = new Set<Permission>();
  roles.filter(isSystemRole).forEach((role) => ROLE_PERMISSIONS[role].forEach((p) => result.add(p)));
  return Array.from(result);
}

/** Highest system role held, used for display; null for non-staff accounts. */
export function highestRole(roles: string[]): SystemRole | null {
  return SYSTEM_ROLES.find((role) => roles.includes(role)) ?? null;
}

/** Landing page after login and target for unknown routes. */
export const HOME_PATH = '/my-inbox';
