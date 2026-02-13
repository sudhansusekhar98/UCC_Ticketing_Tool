import express from 'express';
import {
  login,
  getMe,
  refreshToken,
  logout,
  changePassword,
  updatePreferences,
  updateProfilePicture
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import upload from '../utils/upload.js';
import { authLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

// Public routes (with rate limiting)
router.post('/login', authLimiter, login);
router.post('/refresh', authLimiter, refreshToken);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/change-password', protect, authLimiter, changePassword);
router.put('/preferences', protect, updatePreferences);
router.put('/profile-picture', protect, upload.single('profilePicture'), updateProfilePicture);

export default router;
