import express from 'express';

import {
  getProject,
  updateProject,
  archiveProject,
  unarchiveProject,
  getProjectDashboard,
} from '../controllers/project.controller.js';
import {
  listProjectMembers,
  addProjectMember,
  removeProjectMember,
} from '../controllers/projectMember.controller.js';
import { createTask, listTasks } from '../controllers/task.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { loadProject } from '../middleware/project.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = express.Router();

// --------------------------------------------------------------
// Routes scoped to a single project — loadProject confirms the
// project exists, the caller belongs to its organization, and
// (for non-Owner/Admin roles) the caller has explicit project
// access, before the request reaches the controller.
// --------------------------------------------------------------
router.get('/:projectId', protect, loadProject, getProject);

router.get('/:projectId/dashboard', protect, loadProject, getProjectDashboard);

router.patch(
  '/:projectId',
  protect,
  loadProject,
  requirePermission('projects:update'),
  updateProject,
);

router.patch(
  '/:projectId/archive',
  protect,
  loadProject,
  requirePermission('projects:archive'),
  archiveProject,
);

router.patch(
  '/:projectId/unarchive',
  protect,
  loadProject,
  requirePermission('projects:archive'),
  unarchiveProject,
);

// --------------------------------------------------------------
// Project membership routes — all nested under a verified project.
// --------------------------------------------------------------
router.get('/:projectId/members', protect, loadProject, listProjectMembers);

router.post(
  '/:projectId/members',
  protect,
  loadProject,
  requirePermission('project_members:manage'),
  addProjectMember,
);

router.delete(
  '/:projectId/members/:memberId',
  protect,
  loadProject,
  requirePermission('project_members:manage'),
  removeProjectMember,
);

// --------------------------------------------------------------
// Task creation (FR-12) — nested under a verified project.
// Milestone 4 adds the corresponding GET /:projectId/tasks list
// route and the /api/tasks/:taskId detail/update routes.
// --------------------------------------------------------------
router.post(
  '/:projectId/tasks',
  protect,
  loadProject,
  requirePermission('tasks:create'),
  createTask,
);

router.get('/:projectId/tasks', protect, loadProject, listTasks);

export default router;