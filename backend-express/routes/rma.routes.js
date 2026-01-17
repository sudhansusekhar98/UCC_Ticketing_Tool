import express from 'express';
import { createRMA, getRMAByTicket, getRMAHistory, updateRMAStatus } from '../controllers/rma.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect); // Protect all routes

router.post('/', createRMA);
router.get('/ticket/:ticketId', getRMAByTicket);
router.get('/asset/:assetId', getRMAHistory);

// Status updates - Approve/Order restricted to Admin/Dispatcher usually
// Engineer can 'Install' -> logic handled in frontend/controller permission check? 
// For now, let's allow "modify" roles to update status
router.put('/:id/status', authorize('Admin', 'Supervisor', 'Dispatcher', 'L1Engineer', 'L2Engineer'), updateRMAStatus);

export default router;
