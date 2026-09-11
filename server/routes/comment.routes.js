import express from 'express';
import activityTracker from '../middleware/activity.middleware.js';

import {
  createComment,
  getTaskComments,
  updateComment,
  deleteComment,
} from '../controllers/comment.controller.js';

import { protect } from '../middleware/auth.middleware.js';
import { loadTask } from '../middleware/task.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = express.Router();

// --------------------------------------------------------------
// Create comment
// --------------------------------------------------------------
router.post(
  '/tasks/:taskId/comments',
  protect,
  loadTask,
  requirePermission('comments:create'),
  activityTracker,
  createComment,
);

// --------------------------------------------------------------
// Get comments
//
// Any user who can access the task can read its comments.
// --------------------------------------------------------------
router.get(
  '/tasks/:taskId/comments',
  protect,
  loadTask,
  activityTracker,
  getTaskComments,
);

// --------------------------------------------------------------
// Update comment
//
// Permission middleware is intentionally NOT used here because
// ownership is checked inside the controller.
//
// A user with comments:update may edit their own comment.
// Owner/Admin moderation can edit another user's comment.
// --------------------------------------------------------------
router.patch(
  '/tasks/:taskId/comments/:commentId',
  protect,
  loadTask,
  requirePermission('comments:update'),
  activityTracker,
  updateComment,
);

// --------------------------------------------------------------
// Delete comment
//
// Ownership/moderation is checked inside the controller.
// --------------------------------------------------------------
router.delete(
  '/tasks/:taskId/comments/:commentId',
  protect,
  loadTask,
  requirePermission('comments:delete'),
  deleteComment,
);

export default router;