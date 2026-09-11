import express from 'express';
import activityTracker from '../middleware/activity.middleware.js';

import {
  getProjectActivity,
} from '../controllers/activity.controller.js';

import { protect } from '../middleware/auth.middleware.js';
import {
  loadProject,
} from '../middleware/project.middleware.js';

const router = express.Router();

// GET /api/projects/:projectId/activity
//
// Anyone who can view the project can view its activity.
router.get(
  '/projects/:projectId/activity',
  protect,
  loadProject,
  activityTracker,
  getProjectActivity,
);

export default router;