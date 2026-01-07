import express from 'express';
import {
  downloadAttachment,
  deleteAttachment
} from '../controllers/activity.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/attachments/:id/download', downloadAttachment);
router.delete('/attachments/:id', deleteAttachment);

export default router;
