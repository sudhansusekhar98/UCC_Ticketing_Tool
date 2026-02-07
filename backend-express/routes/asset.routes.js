import express from 'express';
import {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  updateAssetStatus,
  getAssetsDropdown,
  getLocationNames,
  getAssetTypesForSite,
  getDeviceTypesForSite,
  bulkImportAssets,
  exportAssets,
  downloadTemplate,
  checkAssetsStatus,
  updateBulkStatus,
  exportStatusReport,
  getSitesWithAssets
} from '../controllers/asset.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { simpleUpload } from '../utils/upload.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Configure upload - using simpleUpload which handles Vercel/local environments
const upload = simpleUpload;

// Utility routes (before :id routes)
router.get('/dropdown', getAssetsDropdown);
router.get('/locations', getLocationNames);
router.get('/asset-types', getAssetTypesForSite);
router.get('/device-types', getDeviceTypesForSite);
router.get('/sites-with-assets', getSitesWithAssets);
router.get('/template', downloadTemplate);
router.get('/export', exportAssets);
router.get('/export-status', exportStatusReport);
router.post('/check-status', authorize('Admin', 'Supervisor'), checkAssetsStatus);
router.post('/bulk-status-update', authorize('Admin', 'Supervisor'), updateBulkStatus);
router.post('/import', authorize('Admin'), upload.single('file'), bulkImportAssets);

// CRUD routes
router.route('/')
  .get(getAssets)
  .post(authorize('Admin', 'Dispatcher'), createAsset);

router.route('/:id')
  .get(getAssetById)
  .put(authorize('Admin', 'Dispatcher'), updateAsset)
  .delete(authorize('Admin'), deleteAsset);

router.patch('/:id/status', updateAssetStatus);

export default router;

