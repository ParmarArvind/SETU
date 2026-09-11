import express from 'express';

import {
  listTaskAttachments,
  uploadTaskAttachment,
  downloadTaskAttachment,
  deleteTaskAttachment,
} from '../controllers/attachment.controller.js';

import { protect } from '../middleware/auth.middleware.js';
import { loadTask } from '../middleware/task.middleware.js';
import { uploadTaskFile } from '../middleware/upload.middleware.js';

const router = express.Router();

// ============================================================
// GET /api/tasks/:taskId/attachments
// ============================================================

router.get(
  '/:taskId/attachments',
  protect,
  loadTask,
  listTaskAttachments,
);

// ============================================================
// POST /api/tasks/:taskId/attachments
// ============================================================

router.post(
  '/:taskId/attachments',
  protect,
  loadTask,
  uploadTaskFile,
  uploadTaskAttachment,
);

// ============================================================
// GET /api/tasks/:taskId/attachments/:attachmentId
// ============================================================

router.get(
  '/:taskId/attachments/:attachmentId',
  protect,
  loadTask,
  downloadTaskAttachment,
);

// ============================================================
// DELETE /api/tasks/:taskId/attachments/:attachmentId
// ============================================================

router.delete(
  '/:taskId/attachments/:attachmentId',
  protect,
  loadTask,
  deleteTaskAttachment,
);

export default router;