import express from 'express';
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
  rejectResolution,
  acknowledgeRejection,
  escalateTicket,
  acceptEscalation,
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
import { protect, allowAccess } from '../middleware/auth.middleware.js';
import { upload } from '../utils/upload.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard stats (before other routes)
router.get('/dashboard/stats', getDashboardStats);

// CRUD routes
router.route('/')
  .get(getTickets)
  .post(allowAccess({ roles: ['Admin', 'Dispatcher', 'Supervisor'], right: 'CREATE_TICKET' }), createTicket);

router.route('/:id')
  .get(getTicketById)
  .put(allowAccess({ roles: ['Admin', 'Dispatcher', 'Supervisor'], right: 'EDIT_TICKET' }), updateTicket);

// Ticket lifecycle routes
router.post('/:id/assign', assignTicket);
router.post('/:id/acknowledge', acknowledgeTicket); // Logic handled in controller for assignee
router.post('/:id/start', startTicket); // Logic handled in controller for assignee
router.post('/:id/resolve', resolveTicket); // Logic handled in controller for assignee
router.post('/:id/verify', allowAccess({ roles: ['Admin', 'Dispatcher', 'Supervisor'], right: 'EDIT_TICKET' }), verifyTicket);
router.post('/:id/reject-resolution', allowAccess({ roles: ['Admin', 'Dispatcher', 'Supervisor'], right: 'EDIT_TICKET' }), rejectResolution);
router.post('/:id/acknowledge-rejection', acknowledgeRejection); // Logic handled in controller for assignee
router.post('/:id/escalate', escalateTicket);
router.post('/:id/accept-escalation', allowAccess({ roles: ['Admin', 'Dispatcher', 'Supervisor'], rights: ['ESCALATION_L1', 'ESCALATION_L2', 'ESCALATION_L3'] }), acceptEscalation);
router.post('/:id/close', allowAccess({ roles: ['Admin', 'Dispatcher', 'Supervisor'], right: 'DELETE_TICKET' }), closeTicket);
router.post('/:id/reopen', allowAccess({ roles: ['Admin', 'Dispatcher', 'Supervisor'], rights: ['CREATE_TICKET', 'EDIT_TICKET'] }), reopenTicket);

// Audit trail
router.get('/:id/audit', getAuditTrail);

// Activities (comments) routes
router.route('/:ticketId/activities')
  .get(getActivities)
  .post(createActivity);

router.post('/:ticketId/activities/attachments', upload.single('file'), uploadAttachment);

export default router;
