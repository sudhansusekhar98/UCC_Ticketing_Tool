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
  resetPassword,
  getEscalationUsers
} from '../controllers/user.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Utility routes (before :id routes)
router.get('/dropdown', getUsersDropdown);
router.get('/engineers', getEngineers);
router.get('/contacts', getContacts);
router.get('/escalation-users', getEscalationUsers);

// User routes - GET operations allow all roles (site-filtered in controller)
// Only Admin can create/update/delete
router.route('/')
  .get(getUsers)  // Site-based filtering in controller
  .post(authorize('Admin'), createUser);

router.route('/:id')
  .get(getUserById)  // Site-based filtering in controller  
  .put(authorize('Admin'), updateUser)
  .delete(authorize('Admin'), deleteUser);

router.put('/:id/activate', authorize('Admin'), activateUser);
router.put('/:id/deactivate', authorize('Admin'), deactivateUser);
router.put('/:id/reset-password', authorize('Admin'), resetPassword);

export default router;
