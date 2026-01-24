import express from 'express';
import {
  getSettings,
  getSettingsByCategory,
  updateSettings,
  updateSingleSetting
} from '../controllers/settings.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getSettings)
  .put(updateSettings);

router.get('/:category', getSettingsByCategory);
router.patch('/:category/:key', authorize('Admin'), updateSingleSetting);

export default router;
