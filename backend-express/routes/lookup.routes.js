import express from 'express';
import {
  getAllLookups,
  getStatusesEndpoint,
  getPrioritiesEndpoint,
  getCategoriesEndpoint,
  getAssetTypesEndpoint,
  getAssetStatusesEndpoint,
  getRolesEndpoint,
  getDeviceTypesEndpoint,
  getAllDeviceTypesEndpoint,
  getModelsEndpoint
} from '../controllers/lookup.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getAllLookups);
router.get('/statuses', getStatusesEndpoint);
router.get('/priorities', getPrioritiesEndpoint);
router.get('/categories', getCategoriesEndpoint);
router.get('/asset-types', getAssetTypesEndpoint);
router.get('/asset-statuses', getAssetStatusesEndpoint);
router.get('/roles', getRolesEndpoint);

// Device Type routes - fetches from Assets collection
router.get('/device-types', getDeviceTypesEndpoint);
router.get('/device-types/all', getAllDeviceTypesEndpoint);
router.get('/models', getModelsEndpoint);

export default router;
