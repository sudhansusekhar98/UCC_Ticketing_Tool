import express from 'express';
import {
  getSettings,
  getSettingsByCategory,
  updateSettings,
  updateSingleSetting,
  getGlobalSLA,
  updateGlobalSLA
} from '../controllers/settings.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

// Global SLA routes (must be before /:category catch-all)
router.get('/sla', authorize('Admin'), getGlobalSLA);
router.put('/sla', authorize('Admin'), updateGlobalSLA);

router.route('/')
  .get(getSettings)
  .put(updateSettings);

router.get('/:category', getSettingsByCategory);
router.patch('/:category/:key', authorize('Admin'), updateSingleSetting);

export default router;
