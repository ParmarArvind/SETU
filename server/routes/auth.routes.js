import express from 'express';

import {
  register,
  login,
  getCurrentUser,
  logout,
} from '../controllers/auth.controller.js';

import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// --------------------------------------------------------------
// Public routes
// --------------------------------------------------------------
router.post('/register', register);
router.post('/login', login);

// --------------------------------------------------------------
// Protected routes
// --------------------------------------------------------------
router.get('/me', protect, getCurrentUser);
router.post('/logout', protect, logout);

export default router;