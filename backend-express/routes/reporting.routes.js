import express from 'express';
import { 
  getTicketStats, 
  getSLAPerformance, 
  getAssetStats,
  getRMAStats,
  exportReport
} from '../controllers/reporting.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All reporting routes are protected and restricted to specific roles
router.use(protect);
router.use(authorize('Admin', 'Supervisor', 'Dispatcher'));

router.get('/tickets', getTicketStats);
router.get('/sla', getSLAPerformance);
router.get('/assets', getAssetStats);
router.get('/rma', getRMAStats);
router.get('/export', exportReport);

export default router;
