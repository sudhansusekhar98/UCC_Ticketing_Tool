import express from 'express';
import {
    getInventory,
    getStockAvailability,
    createRequisition,
    getRequisitions,
    approveRequisition,
    fulfillRequisition,
    rejectRequisition,
    addStock,
    updateStock,
    deleteStock,
    getTransfers,
    initiateTransfer,
    dispatchTransfer,
    receiveTransfer,
    getDispatchedTransfersForSite,
    bulkUpload,
    exportStockTemplate,
    performStockReplacement,
    getAssetReplacementHistory,
    getStockMovementLogs,
    getMovementStats,
    getStockAssetTypes,
    getStockDeviceTypes,
    getStockModels,
    exportSelectedAssets,
    // Project Stock Allocation
    allocateStockToProject,
    getProjectAllocations,
    updateAllocation,
    deleteAllocation,
    getProjectAllocatedStock,
    getProjectCableAllocations,
    exportStockSummary,
    // Cable usage for tickets
    getCableStockForSite,
    recordCableUsage,
    getCableUsageForTicket
} from '../controllers/stock.controller.js';
import { protect, allowAccess } from '../middleware/auth.middleware.js';
import { simpleUpload } from '../utils/upload.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Shared access-control middleware instances (allowAccess is a pure factory, safe to reuse)
const manageSiteStockAccess = allowAccess({ roles: ['Admin', 'Supervisor'], rights: ['MANAGE_SITE_STOCK'] });
const adminSupervisorOnly = allowAccess({ roles: ['Admin', 'Supervisor'] });
const adminOnly = allowAccess({ roles: ['Admin'] });

// Inventory routes
router.get('/inventory', getInventory);
router.get('/availability/:ticketId', getStockAvailability);
router.get('/asset/:assetId/history', getAssetReplacementHistory);
router.post('/replace', performStockReplacement);

// Stock-specific lookup routes (filter by Spare status only)
router.get('/asset-types', getStockAssetTypes);
router.get('/device-types', getStockDeviceTypes);
router.get('/models', getStockModels);
router.post('/export-selected', exportSelectedAssets);
router.get('/export-summary', manageSiteStockAccess, exportStockSummary);

// Project Stock Allocation routes
router.post('/allocations', adminSupervisorOnly, allocateStockToProject);
router.get('/allocations', getProjectAllocations);
router.get('/allocations/for-device-form', getProjectAllocatedStock);
router.get('/allocations/cables', getProjectCableAllocations);
router.put('/allocations/:id', adminOnly, updateAllocation);
router.delete('/allocations/:id', adminOnly, deleteAllocation);

// Stock management (Admin OR users with MANAGE_SITE_STOCK right)
router.post('/add', manageSiteStockAccess, addStock);
router.post('/bulk-upload', manageSiteStockAccess, simpleUpload.single('file'), bulkUpload);
router.get('/export-template', manageSiteStockAccess, exportStockTemplate);
router.put('/:assetId', manageSiteStockAccess, updateStock);
router.delete('/:assetId', manageSiteStockAccess, deleteStock);

// Cable usage for ticket-based repairs
router.get('/cables', getCableStockForSite);
router.post('/cable-usage', recordCableUsage);
router.get('/cable-usage/:ticketId', getCableUsageForTicket);

// Movement logs
router.get('/movement-logs', getStockMovementLogs);
router.get('/movement-stats', getMovementStats);

// Requisition routes
router.route('/requisitions')
    .get(getRequisitions)
    .post(createRequisition);

router.put('/requisitions/:id/approve', adminSupervisorOnly, approveRequisition);
router.put('/requisitions/:id/fulfill', fulfillRequisition);
router.put('/requisitions/:id/reject', adminSupervisorOnly, rejectRequisition);

// Transfer routes
router.route('/transfers')
    .get(getTransfers)
    .post(adminOnly, initiateTransfer);

router.put('/transfers/:id/dispatch', adminOnly, dispatchTransfer);
router.put('/transfers/:id/receive', receiveTransfer);
router.get('/transfers/dispatched-for-site/:siteId', getDispatchedTransfersForSite);

export default router;

