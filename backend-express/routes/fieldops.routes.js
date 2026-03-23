import express from 'express';
import {
  // Projects
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectDashboard,
  // Zones
  getProjectZones,
  createProjectZone,
  updateProjectZone,
  deleteProjectZone,
  // PM Daily Logs
  getPMDailyLogs,
  getPMDailyLogById,
  createPMDailyLog,
  updatePMDailyLog,
  lockPMDailyLog,
  unlockPMDailyLog,
  uploadPMLogPhotos,
  // Device Installations
  getDeviceInstallations,
  getDeviceInstallationById,
  createDeviceInstallation,
  createBulkDeviceInstallations,
  updateDeviceInstallation,
  updateDeviceStatus,
  getDeviceSummary,
  // Device Assignment
  getDevicesAwaitingAssignment,
  getMyDeviceAssignments,
  assignDeviceToEngineer,
  bulkAssignDevices,
  skipDeviceConfiguration,
  unassignDevice,
  // Vendor Work Logs
  getVendorWorkLogs,
  getVendorWorkLogById,
  createVendorWorkLog,
  updateVendorWorkLog,
  getMyVendorLogs,
  // Challenge Logs
  getChallengeLogs,
  getChallengeLogById,
  createChallengeLog,
  updateChallengeLog,
  resolveChallengeLog,
  getEscalatedChallenges,
  addChallengeComment,
  // Reports
  getProjectReport,
  exportProjectReportPDF,
  exportProjectReportExcel
} from '../controllers/fieldops.controller.js';
import { protect, authorize, allowAccess } from '../middleware/auth.middleware.js';
import { upload } from '../utils/upload.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// ==================== PROJECTS ====================

// GET /api/fieldops/projects - List all projects
router.get('/projects', getProjects);

// POST /api/fieldops/projects - Create project (Admin, Supervisor only)
router.post('/projects',
  allowAccess({ roles: ['Admin', 'Supervisor'] }),
  createProject
);

// GET /api/fieldops/projects/:id - Get single project
router.get('/projects/:id', getProjectById);

// PUT /api/fieldops/projects/:id - Update project (Admin, Supervisor only)
router.put('/projects/:id',
  allowAccess({ roles: ['Admin', 'Supervisor'] }),
  updateProject
);

// DELETE /api/fieldops/projects/:id - Soft delete (Admin only)
router.delete('/projects/:id',
  authorize('Admin'),
  deleteProject
);

// GET /api/fieldops/projects/:id/dashboard - Project stats
router.get('/projects/:id/dashboard', getProjectDashboard);

// ==================== PROJECT ZONES ====================

// GET /api/fieldops/projects/:projectId/zones - List zones
router.get('/projects/:projectId/zones', getProjectZones);

// POST /api/fieldops/projects/:projectId/zones - Add zone
router.post('/projects/:projectId/zones',
  allowAccess({ roles: ['Admin', 'Supervisor'] }),
  createProjectZone
);

// PUT /api/fieldops/zones/:id - Update zone
router.put('/zones/:id',
  allowAccess({ roles: ['Admin', 'Supervisor'] }),
  updateProjectZone
);

// DELETE /api/fieldops/zones/:id - Delete zone
router.delete('/zones/:id',
  allowAccess({ roles: ['Admin', 'Supervisor'] }),
  deleteProjectZone
);

// ==================== Project Manager DAILY LOGS ====================

// GET /api/fieldops/pm-logs - List all logs (filtered by project, date, etc.)
router.get('/pm-logs', getPMDailyLogs);

// POST /api/fieldops/pm-logs - Submit daily log
router.post('/pm-logs', createPMDailyLog);

// GET /api/fieldops/pm-logs/:id - Get single log
router.get('/pm-logs/:id', getPMDailyLogById);

// PUT /api/fieldops/pm-logs/:id - Update log (if not locked or Admin)
router.put('/pm-logs/:id', updatePMDailyLog);

// POST /api/fieldops/pm-logs/:id/lock - Lock log manually
router.post('/pm-logs/:id/lock',
  authorize('Admin'),
  lockPMDailyLog
);

// POST /api/fieldops/pm-logs/:id/unlock - Unlock log (Admin only)
router.post('/pm-logs/:id/unlock',
  authorize('Admin'),
  unlockPMDailyLog
);

// POST /api/fieldops/pm-logs/:id/photos - Upload photos
router.post('/pm-logs/:id/photos',
  upload.array('photos', 10),
  uploadPMLogPhotos
);

// ==================== DEVICE INSTALLATIONS ====================

// GET /api/fieldops/devices - List all devices (with filters)
router.get('/devices', getDeviceInstallations);

// GET /api/fieldops/devices/awaiting-assignment - Get devices awaiting assignment
router.get('/devices/awaiting-assignment', getDevicesAwaitingAssignment);

// GET /api/fieldops/devices/my-assignments - Get devices assigned to current user
router.get('/devices/my-assignments', getMyDeviceAssignments);

// GET /api/fieldops/devices/project/:projectId/summary - Device summary for project
router.get('/devices/project/:projectId/summary', getDeviceSummary);

// POST /api/fieldops/devices/bulk - Add multiple devices at once
router.post('/devices/bulk', createBulkDeviceInstallations);

// POST /api/fieldops/devices/bulk-assign - Bulk assign devices to engineer
router.post('/devices/bulk-assign',
  allowAccess({ roles: ['Admin', 'Supervisor', 'L1Engineer', 'L2Engineer'] }),
  bulkAssignDevices
);

// POST /api/fieldops/devices - Add device
router.post('/devices', createDeviceInstallation);

// GET /api/fieldops/devices/:id - Get single device
router.get('/devices/:id', getDeviceInstallationById);

// PUT /api/fieldops/devices/:id - Update device
router.put('/devices/:id', updateDeviceInstallation);

// PATCH /api/fieldops/devices/:id/status - Update device status only
router.patch('/devices/:id/status', updateDeviceStatus);

// POST /api/fieldops/devices/:id/assign - Assign device to engineer
router.post('/devices/:id/assign',
  allowAccess({ roles: ['Admin', 'Supervisor', 'L1Engineer', 'L2Engineer'] }),
  assignDeviceToEngineer
);

// POST /api/fieldops/devices/:id/unassign - Unassign device
router.post('/devices/:id/unassign',
  allowAccess({ roles: ['Admin', 'Supervisor', 'L1Engineer', 'L2Engineer'] }),
  unassignDevice
);

// POST /api/fieldops/devices/:id/skip-config - Skip configuration for non-IT/passive items
router.post('/devices/:id/skip-config',
  allowAccess({ roles: ['Admin', 'Supervisor', 'L1Engineer', 'L2Engineer'] }),
  skipDeviceConfiguration
);

// ==================== VENDOR WORK LOGS ====================

// GET /api/fieldops/vendor-logs - List all vendor logs
router.get('/vendor-logs', getVendorWorkLogs);

// GET /api/fieldops/vendor-logs/my-logs - Get logs for current vendor user
router.get('/vendor-logs/my-logs', getMyVendorLogs);

// POST /api/fieldops/vendor-logs - Submit vendor work log
router.post('/vendor-logs', createVendorWorkLog);

// GET /api/fieldops/vendor-logs/:id - Get single log
router.get('/vendor-logs/:id', getVendorWorkLogById);

// PUT /api/fieldops/vendor-logs/:id - Update log
router.put('/vendor-logs/:id', updateVendorWorkLog);

// ==================== CHALLENGE LOGS ====================

// GET /api/fieldops/challenges - List all challenges
router.get('/challenges', getChallengeLogs);

// GET /api/fieldops/challenges/escalated - Get escalated challenges (Admin)
router.get('/challenges/escalated',
  allowAccess({ roles: ['Admin', 'Supervisor'] }),
  getEscalatedChallenges
);

// POST /api/fieldops/challenges - Report challenge
router.post('/challenges', createChallengeLog);

// GET /api/fieldops/challenges/:id - Get single challenge
router.get('/challenges/:id', getChallengeLogById);

// PUT /api/fieldops/challenges/:id - Update challenge
router.put('/challenges/:id', updateChallengeLog);

// POST /api/fieldops/challenges/:id/resolve - Mark resolved
router.post('/challenges/:id/resolve', resolveChallengeLog);

// POST /api/fieldops/challenges/:id/comments - Add comment
router.post('/challenges/:id/comments', addChallengeComment);

// ==================== REPORTS ====================

// GET /api/fieldops/reports/project/:id - Generate report data
router.get('/reports/project/:id',
  allowAccess({ roles: ['Admin', 'Supervisor'] }),
  getProjectReport
);

// GET /api/fieldops/reports/project/:id/export/pdf - Export PDF
router.get('/reports/project/:id/export/pdf',
  allowAccess({ roles: ['Admin', 'Supervisor'] }),
  exportProjectReportPDF
);

// GET /api/fieldops/reports/project/:id/export/excel - Export Excel
router.get('/reports/project/:id/export/excel',
  allowAccess({ roles: ['Admin', 'Supervisor'] }),
  exportProjectReportExcel
);

export default router;
