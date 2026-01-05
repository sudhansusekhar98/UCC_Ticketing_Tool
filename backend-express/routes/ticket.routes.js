import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  assignTicket,
  acknowledgeTicket,
  startTicket,
  resolveTicket,
  verifyTicket,
  closeTicket,
  reopenTicket,
  getAuditTrail,
  getDashboardStats
} from '../controllers/ticket.controller.js';
import {
  getActivities,
  createActivity,
  uploadAttachment,
  downloadAttachment,
  deleteAttachment
} from '../controllers/activity.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images and documents are allowed'));
  }
});

// All routes require authentication
router.use(protect);

// Dashboard stats (before other routes)
router.get('/dashboard/stats', getDashboardStats);

// CRUD routes
router.route('/')
  .get(getTickets)
  .post(createTicket);

router.route('/:id')
  .get(getTicketById)
  .put(updateTicket);

// Ticket lifecycle routes
router.post('/:id/assign', authorize('Admin', 'Dispatcher', 'Supervisor'), assignTicket);
router.post('/:id/acknowledge', acknowledgeTicket);
router.post('/:id/start', startTicket);
router.post('/:id/resolve', resolveTicket);
router.post('/:id/verify', authorize('Admin', 'Dispatcher', 'Supervisor'), verifyTicket);
router.post('/:id/close', authorize('Admin', 'Dispatcher', 'Supervisor'), closeTicket);
router.post('/:id/reopen', authorize('Admin', 'Dispatcher', 'Supervisor'), reopenTicket);

// Audit trail
router.get('/:id/audit', getAuditTrail);

// Activities (comments) routes
router.route('/:ticketId/activities')
  .get(getActivities)
  .post(createActivity);

router.post('/:ticketId/activities/attachments', upload.single('file'), uploadAttachment);

export default router;
