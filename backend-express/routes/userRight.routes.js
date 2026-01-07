import express from 'express';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { 
  getAllUserRights, 
  getUserRights, 
  updateUserRights 
} from '../controllers/userRight.controller.js';

const router = express.Router();

// protect all routes
router.use(protect);
router.use(authorize('Admin'));

router.route('/')
  .get(getAllUserRights);

router.route('/:userId')
  .get(getUserRights)
  .put(updateUserRights);

export default router;
