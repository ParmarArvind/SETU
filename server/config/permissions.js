import { ORG_ROLES } from '../models/OrganizationMember.js';

// --------------------------------------------------------------
// Numeric rank for each role — lower number = higher privilege.
// Derived from ORG_ROLES so there is exactly one place (the model)
// that defines role order; this file just consumes it.
//
// Used for hierarchy checks such as "a Manager cannot promote
// someone to a role above their own" (Milestone 6).
// --------------------------------------------------------------
export const ROLE_RANK = ORG_ROLES.reduce((ranks, role, index) => {
  ranks[role] = index;
  return ranks;
}, {});

// --------------------------------------------------------------
// Permission matrix — mirrors SRS Section 3 (User Roles).
//
// Controllers should check PERMISSIONS via hasPermission() rather
// than comparing req.membership.role directly against role names.
// This keeps "what can a Manager do" defined in ONE place, so a
// future rule change (e.g. giving QA the ability to set priority)
// is a one-line edit here instead of a hunt through controllers.
// --------------------------------------------------------------
export const PERMISSIONS = {
  owner: [
    'organization:manage',
    'organization:delete',
    'members:invite',
    'members:remove',
    'members:assign_role',
    'projects:create',
    'projects:update',
    'projects:delete',
    'projects:archive',
    'project_members:manage',
    'tasks:create',
    'tasks:update',
    'tasks:delete',
    'tasks:assign',
    'tasks:manage_priority',
    'analytics:view',
    'chat:participate',
    'files:upload',
  ],
  admin: [
    'members:invite',
    'members:remove',
    'members:assign_role',
    'projects:create',
    'projects:update',
    'projects:archive',
    'project_members:manage',
    'tasks:create',
    'tasks:update',
    'tasks:delete',
    'tasks:assign',
    'tasks:manage_priority',
    'analytics:view',
    'chat:participate',
    'files:upload',
  ],
  manager: [
    'projects:create',
    'project_members:manage',
    'tasks:create',
    'tasks:assign',
    'tasks:manage_priority',
    'analytics:view',
    'chat:participate',
    'files:upload',
  ],
  developer: [
    'tasks:update_own_status',
    'comments:create',
    'chat:participate',
    'files:upload',
  ],
  qa: [
    'bugs:create',
    'bugs:update',
    'bugs:assign',
    'comments:create',
    'chat:participate',
    'files:upload',
  ],
  viewer: [
    'analytics:view',
  ],
};

// --------------------------------------------------------------
// hasPermission(role, permission) -> boolean
// --------------------------------------------------------------
export const hasPermission = (role, permission) => {
  const allowed = PERMISSIONS[role];
  return Array.isArray(allowed) && allowed.includes(permission);
};