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
  exportUserActivitiesReport,
  // HTML report exports
  exportTicketsHtml,
  exportEmployeesHtml,
  exportAssetsHtml,
  exportRMAHtml,
  exportSpareStockHtml,
  exportWorkActivityHtml,
  exportUserActivitiesHtml,
} from '../controllers/reporting.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All reporting routes are protected and restricted to specific roles
router.use(protect);
router.use(authorize('Admin', 'Supervisor', 'Dispatcher'));

// Stats
router.get('/tickets', getTicketStats);
router.get('/sla', getSLAPerformance);
router.get('/assets', getAssetStats);
router.get('/rma', getRMAStats);

// Excel exports
router.get('/export', exportReport);
router.get('/export/employees', exportEmployeeStatusReport);
router.get('/export/assets', exportAssetStatusReport);
router.get('/export/rma', exportRMAReport);
router.get('/export/spare-stock', exportSpareStockReport);
router.get('/export/work-activity', exportWorkActivityReport);
router.get('/export/user-activities', exportUserActivitiesReport);

// HTML report exports
router.get('/export/html/tickets', exportTicketsHtml);
router.get('/export/html/employees', exportEmployeesHtml);
router.get('/export/html/assets', exportAssetsHtml);
router.get('/export/html/rma', exportRMAHtml);
router.get('/export/html/spare-stock', exportSpareStockHtml);
router.get('/export/html/work-activity', exportWorkActivityHtml);
router.get('/export/html/user-activities', exportUserActivitiesHtml);

export default router;
