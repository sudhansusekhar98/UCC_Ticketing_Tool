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
    getTransfers,
    initiateTransfer,
    dispatchTransfer,
    receiveTransfer,
    bulkUpload,
    exportStockTemplate,
    performStockReplacement,
    getAssetReplacementHistory
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

// Stock management (Admin only)
router.post('/add', allowAccess({ roles: ['Admin'] }), addStock);
router.post('/bulk-upload', allowAccess({ roles: ['Admin'] }), simpleUpload.single('file'), bulkUpload);
router.get('/export-template', allowAccess({ roles: ['Admin'] }), exportStockTemplate);

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

export default router;
