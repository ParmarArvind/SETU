import { ORG_ROLES } from '../models/OrganizationMember.js';

// --------------------------------------------------------------
// Numeric rank for each role — lower number = higher privilege.
// --------------------------------------------------------------
export const ROLE_RANK = ORG_ROLES.reduce((ranks, role, index) => {
  ranks[role] = index;
  return ranks;
}, {});

// --------------------------------------------------------------
// Permission matrix
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

    'comments:create',
    'comments:update',
    'comments:delete',
    'comments:moderate',

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

    'comments:create',
    'comments:update',
    'comments:delete',
    'comments:moderate',

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

    'comments:create',
    'comments:update',
    'comments:delete',

    'analytics:view',
    'chat:participate',
    'files:upload',
  ],

  developer: [
    'tasks:update_own_status',

    'comments:create',
    'comments:update',
    'comments:delete',

    'chat:participate',
    'files:upload',
  ],

  qa: [
    'bugs:create',
    'bugs:update',
    'bugs:assign',

    'comments:create',
    'comments:update',
    'comments:delete',

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