import express from 'express';
import {
    submitClientSignup,
    listClientRegistrations,
    approveClientRegistration,
    rejectClientRegistration,
    listClients,
    createClient,
    updateClient,
    deleteClient,
    resetClientPassword
} from '../controllers/clientRegistration.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

// Public: Client self-registration (rate limited)
router.post('/signup', authLimiter, submitClientSignup);

// Admin-only: Client management (CRUD + password reset)
// These MUST come before the /:id routes to prevent "clients" being treated as an :id
router.get('/clients', protect, authorize('Admin'), listClients);
router.post('/clients', protect, authorize('Admin'), createClient);
router.put('/clients/:id', protect, authorize('Admin'), updateClient);
router.delete('/clients/:id', protect, authorize('Admin'), deleteClient);
router.post('/clients/:id/reset-password', protect, authorize('Admin'), resetClientPassword);

// Admin-only: Manage registrations
router.get('/', protect, authorize('Admin'), listClientRegistrations);
router.post('/:id/approve', protect, authorize('Admin'), approveClientRegistration);
router.post('/:id/reject', protect, authorize('Admin'), rejectClientRegistration);

export default router;
