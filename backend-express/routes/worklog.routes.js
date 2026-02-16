import express from 'express';
import {
    getMyLogs,
    getMyToday,
    getUserLogs,
    getTeamLogs,
    addManualEntry,
    updateSummary,
    deleteManualEntry
} from '../controllers/worklog.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import upload from '../utils/upload.js';

const router = express.Router();

router.use(protect);

// Current user routes
router.get('/my', getMyLogs);
router.get('/my/today', getMyToday);
router.post('/manual', upload.array('attachments', 5), addManualEntry);
router.put('/summary', updateSummary);
router.delete('/manual/:activityId', deleteManualEntry);

// Admin/Supervisor routes
router.get('/user/:userId', authorize('Admin', 'Supervisor'), getUserLogs);
router.get('/team', authorize('Admin', 'Supervisor'), getTeamLogs);

export default router;
