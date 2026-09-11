import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { listNotifications, markRead, markAllRead } from '../controllers/notification.controller.js';
const router = express.Router();
router.get('/', protect, listNotifications);
router.patch('/read-all', protect, markAllRead);
router.patch('/:id/read', protect, markRead);
export default router;
