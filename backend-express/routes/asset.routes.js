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
  downloadTemplate
} from '../controllers/asset.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import multer from 'multer';
import os from 'os';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Configure upload
const upload = multer({ dest: os.tmpdir() });

// Utility routes (before :id routes)
router.get('/dropdown', getAssetsDropdown);
router.get('/locations', getLocationNames);
router.get('/asset-types', getAssetTypesForSite);
router.get('/device-types', getDeviceTypesForSite);
router.get('/template', downloadTemplate);
router.get('/export', exportAssets);
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
