import express from 'express';

import {
  getTask,
  updateTask,
  assignTask,
  updateTaskPriority,
} from '../controllers/task.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { loadTask } from '../middleware/task.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = express.Router();

// --------------------------------------------------------------
// Routes scoped to a single task — loadTask confirms the task
// exists, the caller belongs to its organization, and (for
// non-Owner/Admin roles) the caller has explicit access to the
// task's project, before the request reaches the controller.
// --------------------------------------------------------------
router.get('/:taskId', protect, loadTask, getTask);

router.patch(
  '/:taskId',
  protect,
  loadTask,
  requirePermission('tasks:update'),
  updateTask,
);

router.patch(
  '/:taskId/assign',
  protect,
  loadTask,
  requirePermission('tasks:assign'),
  assignTask,
);

router.patch(
  '/:taskId/priority',
  protect,
  loadTask,
  requirePermission('tasks:manage_priority'),
  updateTaskPriority,
);

export default router;