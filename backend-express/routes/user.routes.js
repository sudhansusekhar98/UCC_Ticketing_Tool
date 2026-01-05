import express from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUsersDropdown,
  getEngineers,
  getContacts,
  activateUser,
  deactivateUser,
  resetPassword
} from '../controllers/user.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Utility routes (before :id routes)
router.get('/dropdown', getUsersDropdown);
router.get('/engineers', getEngineers);
router.get('/contacts', getContacts);

// Admin only routes
router.route('/')
  .get(authorize('Admin', 'Supervisor'), getUsers)
  .post(authorize('Admin'), createUser);

router.route('/:id')
  .get(authorize('Admin', 'Supervisor'), getUserById)
  .put(authorize('Admin'), updateUser)
  .delete(authorize('Admin'), deleteUser);

router.put('/:id/activate', authorize('Admin'), activateUser);
router.put('/:id/deactivate', authorize('Admin'), deactivateUser);
router.put('/:id/reset-password', authorize('Admin'), resetPassword);

export default router;
