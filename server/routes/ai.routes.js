import express from 'express';

import {
  getAIStatus,
  testAI,
  analyzeIssueWithAI,
  summarizeIssueWithAI,
  recommendPriorityWithAI,
  recommendLabelsWithAI,
  generateSubtasksWithAI,
  suggestSolutionsWithAI,
} from '../controllers/ai.controller.js';

import { protect } from '../middleware/auth.middleware.js';

import { loadTask } from '../middleware/task.middleware.js';

const router = express.Router();

// --------------------------------------------------------------
// AI status
//
// GET /api/ai/status
// --------------------------------------------------------------

router.get(
  '/status',
  protect,
  getAIStatus,
);

// --------------------------------------------------------------
// AI test endpoint
//
// POST /api/ai/test
// --------------------------------------------------------------

router.post(
  '/test',
  protect,
  testAI,
);

// --------------------------------------------------------------
// AI issue analysis
//
// POST /api/ai/analyze-issue
//
// Body:
// {
//   "taskId": "<SETU TASK ID>"
// }
// --------------------------------------------------------------

router.post(
  '/analyze-issue',
  protect,
  (req, res, next) => {
    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'taskId is required.',
      });
    }

    req.params.taskId = taskId;

    return next();
  },
  loadTask,
  analyzeIssueWithAI,
);

// --------------------------------------------------------------
// AI issue summary
//
// POST /api/ai/summarize
//
// Body:
// {
//   "taskId": "<SETU TASK ID>"
// }
// --------------------------------------------------------------

router.post(
  '/summarize',
  protect,
  (req, res, next) => {
    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'taskId is required.',
      });
    }

    req.params.taskId = taskId;

    return next();
  },
  loadTask,
  summarizeIssueWithAI,
);

// --------------------------------------------------------------
// AI priority recommendation
//
// POST /api/ai/recommend-priority
//
// Body:
// {
//   "taskId": "<SETU TASK ID>"
// }
// --------------------------------------------------------------

router.post(
  '/recommend-priority',
  protect,
  (req, res, next) => {
    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'taskId is required.',
      });
    }

    req.params.taskId = taskId;

    return next();
  },
  loadTask,
  recommendPriorityWithAI,
);

// --------------------------------------------------------------
// AI label recommendation
//
// POST /api/ai/recommend-labels
//
// Body:
// {
//   "taskId": "<SETU TASK ID>"
// }
// --------------------------------------------------------------

router.post(
  '/recommend-labels',
  protect,
  (req, res, next) => {
    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'taskId is required.',
      });
    }

    req.params.taskId = taskId;

    return next();
  },
  loadTask,
  recommendLabelsWithAI,
);

// --------------------------------------------------------------
// AI subtask generation
//
// POST /api/ai/generate-subtasks
//
// Body:
// {
//   "taskId": "<SETU TASK ID>"
// }
// --------------------------------------------------------------

router.post(
  '/generate-subtasks',
  protect,
  (req, res, next) => {
    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'taskId is required.',
      });
    }

    req.params.taskId = taskId;

    return next();
  },
  loadTask,
  generateSubtasksWithAI,
);

// --------------------------------------------------------------
// AI solution suggestions
//
// POST /api/ai/suggest-solutions
//
// Body:
// {
//   "taskId": "<SETU TASK ID>"
// }
// --------------------------------------------------------------

router.post(
  '/suggest-solutions',
  protect,
  (req, res, next) => {
    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'taskId is required.',
      });
    }

    req.params.taskId = taskId;

    return next();
  },
  loadTask,
  suggestSolutionsWithAI,
);

export default router;