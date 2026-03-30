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
    getProjectCableAllocations
} from '../controllers/stock.controller.js';
import { protect, allowAccess } from '../middleware/auth.middleware.js';
import { simpleUpload } from '../utils/upload.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

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

// Project Stock Allocation routes
router.post('/allocations', allowAccess({ roles: ['Admin', 'Supervisor'] }), allocateStockToProject);
router.get('/allocations', getProjectAllocations);
router.get('/allocations/for-device-form', getProjectAllocatedStock);
router.get('/allocations/cables', getProjectCableAllocations);
router.put('/allocations/:id', allowAccess({ roles: ['Admin'] }), updateAllocation);
router.delete('/allocations/:id', allowAccess({ roles: ['Admin'] }), deleteAllocation);

// Stock management (Admin OR users with MANAGE_SITE_STOCK right)
router.post('/add', allowAccess({ roles: ['Admin', 'Supervisor'], rights: ['MANAGE_SITE_STOCK'] }), addStock);
router.post('/bulk-upload', allowAccess({ roles: ['Admin', 'Supervisor'], rights: ['MANAGE_SITE_STOCK'] }), simpleUpload.single('file'), bulkUpload);
router.get('/export-template', allowAccess({ roles: ['Admin', 'Supervisor'], rights: ['MANAGE_SITE_STOCK'] }), exportStockTemplate);
router.put('/:assetId', allowAccess({ roles: ['Admin', 'Supervisor'], rights: ['MANAGE_SITE_STOCK'] }), updateStock);
router.delete('/:assetId', allowAccess({ roles: ['Admin', 'Supervisor'], rights: ['MANAGE_SITE_STOCK'] }), deleteStock);

// Movement logs
router.get('/movement-logs', getStockMovementLogs);
router.get('/movement-stats', getMovementStats);

// Requisition routes
router.route('/requisitions')
    .get(getRequisitions)
    .post(createRequisition);

router.put('/requisitions/:id/approve', allowAccess({ roles: ['Admin', 'Supervisor'] }), approveRequisition);
router.put('/requisitions/:id/fulfill', fulfillRequisition);
router.put('/requisitions/:id/reject', allowAccess({ roles: ['Admin', 'Supervisor'] }), rejectRequisition);

// Transfer routes
router.route('/transfers')
    .get(getTransfers)
    .post(allowAccess({ roles: ['Admin'] }), initiateTransfer);

router.put('/transfers/:id/dispatch', allowAccess({ roles: ['Admin'] }), dispatchTransfer);
router.put('/transfers/:id/receive', receiveTransfer);
router.get('/transfers/dispatched-for-site/:siteId', getDispatchedTransfersForSite);

export default router;

