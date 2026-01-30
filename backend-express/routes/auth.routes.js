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

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/refresh', refreshToken);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/change-password', protect, changePassword);
router.put('/preferences', protect, updatePreferences);
router.put('/profile-picture', protect, upload.single('profilePicture'), updateProfilePicture);

export default router;
