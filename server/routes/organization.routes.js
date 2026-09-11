import express from 'express';
import activityTracker from '../middleware/activity.middleware.js';

import {
  createOrganization,
  listMyOrganizations,
  getOrganization,
  updateOrganization,
  discoverOrganizations,
} from '../controllers/organization.controller.js';
import {
  listMembers,
  addMember,
  removeMember,
  assignRole,
} from '../controllers/member.controller.js';
import { createProject, listProjects } from '../controllers/project.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { loadMembership, loadOrganization } from '../middleware/organization.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import OrganizationRequest from '../models/OrganizationRequest.js';
import { createInvitation, createJoinRequest, listOrganizationRequests, respondToRequest } from '../controllers/membershipRequest.controller.js';

const router = express.Router();

// --------------------------------------------------------------
// Routes with no :id in the path — every logged-in user can
// create an organization or list the ones they already belong to.
// --------------------------------------------------------------
router.post('/', protect, createOrganization);
router.get('/', protect, listMyOrganizations);
router.get('/discover', protect, discoverOrganizations);
router.patch('/membership-requests/:requestId/respond', protect, async (req, res, next) => {
  try {
    const request = await OrganizationRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    req.params.id = String(request.organization);
    if (request.type === 'invitation' && String(request.user) === String(req.user.id)) return respondToRequest(req, res, next);
    return loadMembership(req, res, () => respondToRequest(req, res, next));
  } catch (error) { return next(error); }
});

// --------------------------------------------------------------
// Routes scoped to a single organization — loadMembership confirms
// the organization exists AND the caller is an active member
// before the request reaches the controller (FR-07 data isolation).
// --------------------------------------------------------------
router.get('/:id', protect, loadMembership, getOrganization);
router.post('/:id/join-requests', protect, loadOrganization, createJoinRequest);

router.patch(
  '/:id',
  protect,
  loadMembership,
  requirePermission('organization:manage'),
  activityTracker,
  updateOrganization,
);

// --------------------------------------------------------------
// Membership routes (FR-06) — all nested under a verified org.
// --------------------------------------------------------------
router.get('/:id/members', protect, loadMembership, listMembers);
router.get('/:id/membership-requests', protect, loadMembership, listOrganizationRequests);

router.post(
  '/:id/members',
  protect,
  loadMembership,
  requirePermission('members:invite'),
  createInvitation,
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
