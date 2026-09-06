import express from 'express';

import {
  createOrganization,
  listMyOrganizations,
  getOrganization,
  updateOrganization,
} from '../controllers/organization.controller.js';
import {
  listMembers,
  addMember,
  removeMember,
  assignRole,
} from '../controllers/member.controller.js';
import { createProject, listProjects } from '../controllers/project.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { loadMembership } from '../middleware/organization.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = express.Router();

// --------------------------------------------------------------
// Routes with no :id in the path — every logged-in user can
// create an organization or list the ones they already belong to.
// --------------------------------------------------------------
router.post('/', protect, createOrganization);
router.get('/', protect, listMyOrganizations);

// --------------------------------------------------------------
// Routes scoped to a single organization — loadMembership confirms
// the organization exists AND the caller is an active member
// before the request reaches the controller (FR-07 data isolation).
// --------------------------------------------------------------
router.get('/:id', protect, loadMembership, getOrganization);

router.patch(
  '/:id',
  protect,
  loadMembership,
  requirePermission('organization:manage'),
  updateOrganization,
);

// --------------------------------------------------------------
// Membership routes (FR-06) — all nested under a verified org.
// --------------------------------------------------------------
router.get('/:id/members', protect, loadMembership, listMembers);

router.post(
  '/:id/members',
  protect,
  loadMembership,
  requirePermission('members:invite'),
  addMember,
);

router.delete(
  '/:id/members/:memberId',
  protect,
  loadMembership,
  requirePermission('members:remove'),
  removeMember,
);

router.patch(
  '/:id/members/:memberId/role',
  protect,
  loadMembership,
  requirePermission('members:assign_role'),
  assignRole,
);

// --------------------------------------------------------------
// Project creation (FR-08) — nested under a verified org.
// Milestone 4 adds the corresponding GET /:id/projects list route
// and the /api/projects/:projectId detail/update routes.
// --------------------------------------------------------------
router.post(
  '/:id/projects',
  protect,
  loadMembership,
  requirePermission('projects:create'),
  createProject,
);

router.get('/:id/projects', protect, loadMembership, listProjects);

export default router;