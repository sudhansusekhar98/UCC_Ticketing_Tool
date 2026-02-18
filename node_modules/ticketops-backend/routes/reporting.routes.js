import express from 'express';
import {
  getTicketStats,
  getSLAPerformance,
  getAssetStats,
  getRMAStats,
  exportReport,
  exportEmployeeStatusReport,
  exportAssetStatusReport,
  exportRMAReport,
  exportSpareStockReport,
  exportWorkActivityReport,
  exportUserActivitiesReport
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
router.get('/export/employees', exportEmployeeStatusReport);
router.get('/export/assets', exportAssetStatusReport);
router.get('/export/rma', exportRMAReport);
router.get('/export/spare-stock', exportSpareStockReport);
router.get('/export/work-activity', exportWorkActivityReport);
router.get('/export/user-activities', exportUserActivitiesReport);

export default router;
