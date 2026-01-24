import express from 'express';
import {
  initiateAssetUpdateRequest,
  validateAccessToken,
  submitAssetChanges,
  getPendingRequestByTicket,
  approveAssetUpdate,
  rejectAssetUpdate
} from '../controllers/assetUpdateRequest.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes (token-based access)
router.get('/validate/:token', validateAccessToken);
router.put('/:token/submit', submitAssetChanges);

// Protected routes
router.use(protect);

// Initiate update request (Engineers can initiate)
router.post('/initiate', authorize('Admin', 'Supervisor', 'L1Engineer', 'L2Engineer'), initiateAssetUpdateRequest);

// Get pending request by ticket
router.get('/ticket/:ticketId', getPendingRequestByTicket);

// Approve/Reject (Admin/Supervisor only)
router.post('/:id/approve', authorize('Admin', 'Supervisor'), approveAssetUpdate);
router.post('/:id/reject', authorize('Admin', 'Supervisor'), rejectAssetUpdate);

export default router;
