import express from 'express';
import {
  getAllLookups,
  getStatusesEndpoint,
  getPrioritiesEndpoint,
  getCategoriesEndpoint,
  getAssetTypesEndpoint,
  getAssetStatusesEndpoint,
  getRolesEndpoint
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

export default router;
