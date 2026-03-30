import express from 'express';
import {
  getSites,
  getSiteById,
  createSite,
  updateSite,
  deleteSite,
  getSitesDropdown,
  getCities,
  getSiteSLA,
  updateSiteSLA
} from '../controllers/site.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dropdown & utility routes (before :id routes)
router.get('/dropdown', getSitesDropdown);
router.get('/cities', getCities);

// CRUD routes
router.route('/')
  .get(getSites)
  .post(authorize('Admin', 'Dispatcher'), createSite);

// SLA routes (must be before /:id catch-all)
router.get('/:id/sla', getSiteSLA);
router.put('/:id/sla', authorize('Admin'), updateSiteSLA);

router.route('/:id')
  .get(getSiteById)
  .put(authorize('Admin', 'Dispatcher'), updateSite)
  .delete(authorize('Admin'), deleteSite);

export default router;
