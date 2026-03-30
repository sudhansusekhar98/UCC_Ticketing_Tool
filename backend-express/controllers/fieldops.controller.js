import mongoose from 'mongoose';
import Project, { ProjectStatuses } from '../models/Project.model.js';
import ProjectZone from '../models/ProjectZone.model.js';
import PMDailyLog, { PhotoTypes } from '../models/PMDailyLog.model.js';
import DeviceInstallation, { DeviceTypes, InstallationStatuses } from '../models/DeviceInstallation.model.js';
import VendorWorkLog, { LabourTypes, TrenchStatuses } from '../models/VendorWorkLog.model.js';
import ChallengeLog, { IssueTypes, Severities, ResolutionStatuses } from '../models/ChallengeLog.model.js';
import ProjectStockAllocation from '../models/ProjectStockAllocation.model.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';
import { sendDeviceAssignmentEmail } from '../utils/email.utils.js';

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if user can access a project
 */
const canAccessProject = (user, project) => {
  // Admin and Supervisor have full access
  if (['Admin', 'Supervisor'].includes(user.role)) return true;

  // Check if user is assigned PM
  if (project.assignedPM && project.assignedPM.toString() === user._id.toString()) return true;

  // Check if user is in team members
  if (project.teamMembers && project.teamMembers.some(tm => tm.toString() === user._id.toString())) return true;

  // Check if user is assigned vendor
  if (project.assignedVendors && project.assignedVendors.some(v => v.toString() === user._id.toString())) return true;

  return false;
};

/**
 * Check if user is the assigned PM for a project
 */
const isAssignedPM = (user, project) => {
  return project.assignedPM && project.assignedPM.toString() === user._id.toString();
};

/**
 * Check if user is an assigned vendor for a project
 */
const isAssignedVendor = (user, project) => {
  return project.assignedVendors && project.assignedVendors.some(v => v.toString() === user._id.toString());
};

// ==================== PROJECT CONTROLLERS ====================

/**
 * @desc    Get all projects
 * @route   GET /api/fieldops/projects
 * @access  Private
 */
export const getProjects = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search, assignedPM, startDate, endDate, linkedSiteId } = req.query;
    const query = { isActive: true };

    // Apply filters
    // Handle comma-separated status values (e.g., 'Active,Planning')
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      if (statuses.length > 1) {
        query.status = { $in: statuses };
      } else {
        query.status = statuses[0];
      }
    }
    if (assignedPM) query.assignedPM = assignedPM;
    // Filter by linked site
    if (linkedSiteId) query.linkedSiteId = linkedSiteId;
    if (search) {
      query.$or = [
        { projectName: new RegExp(search, 'i') },
        { clientName: new RegExp(search, 'i') },
        { projectNumber: new RegExp(search, 'i') }
      ];
    }
    if (startDate && endDate) {
      query.contractStartDate = { $gte: new Date(startDate) };
      query.contractEndDate = { $lte: new Date(endDate) };
    }

    // For non-admin/supervisor users, only show their assigned projects
    if (!['Admin', 'Supervisor'].includes(req.user.role)) {
      query.$or = [
        { assignedPM: req.user._id },
        { teamMembers: req.user._id },
        { assignedVendors: req.user._id }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate('assignedPM', 'fullName email')
        .populate('linkedSiteId', 'siteName siteUniqueID')
        .populate('createdBy', 'fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Project.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single project
 * @route   GET /api/fieldops/projects/:id
 * @access  Private
 */
export const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('assignedPM', 'fullName email phone')
      .populate('teamMembers', 'fullName email')
      .populate('assignedVendors', 'fullName email companyName')
      .populate('linkedSiteId', 'siteName siteUniqueID address')
      .populate('createdBy', 'fullName')
      .populate('zones');

    if (!project || !project.isActive) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Check access
    if (!canAccessProject(req.user, project)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this project' });
    }

    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create project
 * @route   POST /api/fieldops/projects
 * @access  Private (Admin, Supervisor)
 */
export const createProject = async (req, res, next) => {
  try {
    const projectData = {
      ...req.body,
      createdBy: req.user._id
    };

    const project = await Project.create(projectData);

    const populatedProject = await Project.findById(project._id)
      .populate('assignedPM', 'fullName email')
      .populate('linkedSiteId', 'siteName siteUniqueID')
      .populate('createdBy', 'fullName');

    res.status(201).json({
      success: true,
      data: populatedProject,
      message: 'Project created successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Project with this number already exists'
      });
    }
    next(error);
  }
};

/**
 * @desc    Update project
 * @route   PUT /api/fieldops/projects/:id
 * @access  Private (Admin, Supervisor)
 */
export const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('assignedPM', 'fullName email')
      .populate('linkedSiteId', 'siteName siteUniqueID');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({
      success: true,
      data: project,
      message: 'Project updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete project (soft delete)
 * @route   DELETE /api/fieldops/projects/:id
 * @access  Private (Admin)
 */
export const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { isActive: false, deletedAt: new Date() },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get project dashboard/stats
 * @route   GET /api/fieldops/projects/:id/dashboard
 * @access  Private
 */
export const getProjectDashboard = async (req, res, next) => {
  try {
    const projectId = req.params.id;

    const project = await Project.findById(projectId);
    if (!project || !project.isActive) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (!canAccessProject(req.user, project)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Get aggregated stats
    const [
      deviceStats,
      logStats,
      challengeStats,
      vendorStats,
      recentLogs,
      allocationStats,
      assignedDeviceCount
    ] = await Promise.all([
      // Device installation stats by status
      DeviceInstallation.aggregate([
        { $match: { projectId: project._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // Daily log stats
      PMDailyLog.aggregate([
        { $match: { projectId: project._id } },
        {
          $group: {
            _id: null,
            totalLogs: { $sum: 1 },
            avgProgress: { $avg: '$progressPercentage' },
            totalManHours: { $sum: '$manHours' }
          }
        }
      ]),
      // Challenge stats by status
      ChallengeLog.aggregate([
        { $match: { projectId: project._id } },
        { $group: { _id: '$resolutionStatus', count: { $sum: 1 } } }
      ]),
      // Vendor work stats
      VendorWorkLog.aggregate([
        { $match: { projectId: project._id } },
        {
          $group: {
            _id: null,
            totalLogs: { $sum: 1 },
            totalCrewCount: { $sum: '$crewCount' },
            totalLength: { $sum: '$areaWorked.lengthMeters' }
          }
        }
      ]),
      // Recent daily logs
      PMDailyLog.find({ projectId: project._id })
        .sort({ logDate: -1 })
        .limit(5)
        .populate('submittedBy', 'fullName'),
      // Stock allocation stats
      ProjectStockAllocation.aggregate([
        { $match: { projectId: project._id } },
        {
          $group: {
            _id: null,
            totalAllocated: { $sum: '$allocatedQty' },
            totalInstalled: { $sum: '$installedQty' },
            totalFaulty: { $sum: '$faultyQty' },
            allocationCount: { $sum: 1 }
          }
        }
      ]),
      // Assigned devices count
      DeviceInstallation.countDocuments({ 
        projectId: project._id, 
        assignedTo: { $exists: true, $ne: null } 
      })
    ]);

    const allocStats = allocationStats[0] || { totalAllocated: 0, totalInstalled: 0, totalFaulty: 0, allocationCount: 0 };

    // ── Auto-calculated project progress (stock-aware) ──
    const totalDevices = deviceStats.reduce((sum, s) => sum + s.count, 0);
    const byStatus = deviceStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {});

    // Device counts by milestone stage (for configuration & testing workflow)
    const configuredPlus = (byStatus.Configured || 0) + (byStatus.Tested || 0) + (byStatus.Deployed || 0);
    const testedPlus = (byStatus.Tested || 0) + (byStatus.Deployed || 0);

    // Installation count comes from stock allocation system (tracks actual installed qty)
    // NOT from DeviceInstallation status counts (which may not have records for every item)
    const stockInstalled = allocStats.totalInstalled || 0;

    // Stock-aware denominator: use allocated stock quantity as the "scope"
    // If stock is returned/reduced, allocatedQty decreases → denominator shrinks → % rises
    // Fall back to totalDevices if no allocations exist
    const allocatedScope = allocStats.totalAllocated > 0 ? allocStats.totalAllocated : totalDevices;

    let taskProgress = 0;
    let timeProgress = 0;
    let scheduleStatus = 'Not Started';
    const milestoneBreakdown = {
      installation: 0,
      configuration: 0,
      testing: 0,
      // Raw counts for frontend display
      installedCount: Math.round(stockInstalled),
      configuredCount: configuredPlus,
      testedCount: testedPlus,
      faultyCount: Math.round(allocStats.totalFaulty || 0),
      allocatedScope: Math.round(allocatedScope),
      totalDevices
    };

    if (allocatedScope > 0) {
      // Installation: stock-based (actual installed qty from allocation tracking)
      milestoneBreakdown.installation = Math.min(100, Math.round((stockInstalled / allocatedScope) * 100));
      // Configuration & Testing: device workflow-based
      milestoneBreakdown.configuration = Math.min(100, Math.round((configuredPlus / allocatedScope) * 100));
      milestoneBreakdown.testing = Math.min(100, Math.round((testedPlus / allocatedScope) * 100));

      // Weighted task progress: Installation=30%, Configuration=30%, Testing=40%
      taskProgress = Math.round(
        (milestoneBreakdown.installation * 0.30) +
        (milestoneBreakdown.configuration * 0.30) +
        (milestoneBreakdown.testing * 0.40)
      );
    }

    // Time-based progress
    const now = new Date();
    const contractStart = new Date(project.contractStartDate);
    const contractEnd = new Date(project.contractEndDate);
    const totalDays = Math.max(1, Math.ceil((contractEnd - contractStart) / (1000 * 60 * 60 * 24)));
    const elapsedDays = Math.max(0, Math.ceil((now - contractStart) / (1000 * 60 * 60 * 24)));
    timeProgress = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

    if (allocatedScope === 0 && totalDevices === 0) {
      scheduleStatus = now < contractStart ? 'Not Started' : 'No Devices';
    } else if (taskProgress >= timeProgress) {
      scheduleStatus = 'On Track';
    } else {
      scheduleStatus = 'Behind Schedule';
    }

    const progressData = {
      taskProgress,
      timeProgress,
      scheduleStatus,
      milestoneBreakdown,
      contractDays: totalDays,
      elapsedDays: Math.min(elapsedDays, totalDays),
      remainingDays: Math.max(0, totalDays - elapsedDays)
    };

    res.json({
      success: true,
      data: {
        project: {
          _id: project._id,
          projectNumber: project.projectNumber,
          projectName: project.projectName,
          status: project.status,
          progressPercentage: taskProgress
        },
        devices: {
          byStatus: deviceStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
          total: deviceStats.reduce((sum, s) => sum + s.count, 0),
          assignedCount: assignedDeviceCount || 0
        },
        dailyLogs: {
          total: logStats[0]?.totalLogs || 0,
          avgProgress: Math.round(logStats[0]?.avgProgress || 0),
          totalManHours: logStats[0]?.totalManHours || 0
        },
        challenges: {
          byStatus: challengeStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
          total: challengeStats.reduce((sum, s) => sum + s.count, 0)
        },
        vendorWork: {
          totalLogs: vendorStats[0]?.totalLogs || 0,
          totalCrewCount: vendorStats[0]?.totalCrewCount || 0,
          totalLengthMeters: vendorStats[0]?.totalLength || 0
        },
        allocations: {
          totalAllocated: Number((allocStats.totalAllocated || 0).toFixed(2)),
          totalInstalled: Number((allocStats.totalInstalled || 0).toFixed(2)),
          totalFaulty: Number((allocStats.totalFaulty || 0).toFixed(2)),
          remaining: Number((allocStats.totalAllocated - allocStats.totalInstalled - allocStats.totalFaulty || 0).toFixed(2)),
          count: allocStats.allocationCount
        },
        recentLogs,
        progress: progressData
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== PROJECT ZONE CONTROLLERS ====================

/**
 * @desc    Get project zones
 * @route   GET /api/fieldops/projects/:projectId/zones
 * @access  Private
 */
export const getProjectZones = async (req, res, next) => {
  try {
    const zones = await ProjectZone.find({
      projectId: req.params.projectId,
      isActive: true
    }).sort({ zoneName: 1 });

    res.json({ success: true, data: zones });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create project zone
 * @route   POST /api/fieldops/projects/:projectId/zones
 * @access  Private (Admin, Supervisor)
 */
export const createProjectZone = async (req, res, next) => {
  try {
    const zone = await ProjectZone.create({
      ...req.body,
      projectId: req.params.projectId
    });

    res.status(201).json({
      success: true,
      data: zone,
      message: 'Zone created successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Zone with this name already exists in the project'
      });
    }
    next(error);
  }
};

/**
 * @desc    Update project zone
 * @route   PUT /api/fieldops/zones/:id
 * @access  Private (Admin, Supervisor)
 */
export const updateProjectZone = async (req, res, next) => {
  try {
    const zone = await ProjectZone.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!zone) {
      return res.status(404).json({ success: false, message: 'Zone not found' });
    }

    res.json({
      success: true,
      data: zone,
      message: 'Zone updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete project zone
 * @route   DELETE /api/fieldops/zones/:id
 * @access  Private (Admin, Supervisor)
 */
export const deleteProjectZone = async (req, res, next) => {
  try {
    const zone = await ProjectZone.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!zone) {
      return res.status(404).json({ success: false, message: 'Zone not found' });
    }

    res.json({ success: true, message: 'Zone deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ==================== PM DAILY LOG CONTROLLERS ====================

/**
 * @desc    Get PM daily logs
 * @route   GET /api/fieldops/pm-logs
 * @access  Private
 */
export const getPMDailyLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, projectId, startDate, endDate, submittedBy } = req.query;
    const query = {};

    if (projectId) query.projectId = projectId;
    if (submittedBy) query.submittedBy = submittedBy;
    if (startDate && endDate) {
      query.logDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Non-admin users can only see logs for their projects
    if (!['Admin', 'Supervisor'].includes(req.user.role)) {
      const userProjects = await Project.find({
        isActive: true,
        $or: [
          { assignedPM: req.user._id },
          { teamMembers: req.user._id },
          { assignedVendors: req.user._id }
        ]
      }).select('_id');

      query.projectId = { $in: userProjects.map(p => p._id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      PMDailyLog.find(query)
        .populate('projectId', 'projectNumber projectName')
        .populate('submittedBy', 'fullName email')
        .sort({ logDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      PMDailyLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single PM daily log
 * @route   GET /api/fieldops/pm-logs/:id
 * @access  Private
 */
export const getPMDailyLogById = async (req, res, next) => {
  try {
    const log = await PMDailyLog.findById(req.params.id)
      .populate('projectId', 'projectNumber projectName clientName')
      .populate('submittedBy', 'fullName email')
      .populate('unlockedBy', 'fullName');

    if (!log) {
      return res.status(404).json({ success: false, message: 'Log not found' });
    }

    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create PM daily log
 * @route   POST /api/fieldops/pm-logs
 * @access  Private
 */
export const createPMDailyLog = async (req, res, next) => {
  try {
    const { projectId, logDate } = req.body;

    // Verify project exists and user has access
    const project = await Project.findById(projectId);
    if (!project || !project.isActive) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Check if user is assigned PM or team member
    const canCreateLog = ['Admin', 'Supervisor'].includes(req.user.role) ||
      isAssignedPM(req.user, project) ||
      project.teamMembers.some(tm => tm.toString() === req.user._id.toString());

    if (!canCreateLog) {
      return res.status(403).json({
        success: false,
        message: 'Only assigned PM or team members can create daily logs'
      });
    }

    // Check for duplicate log on same date
    const existingLog = await PMDailyLog.findOne({
      projectId,
      submittedBy: req.user._id,
      logDate: new Date(logDate)
    });

    if (existingLog) {
      return res.status(400).json({
        success: false,
        message: 'Daily log already exists for this date. You can edit the existing log instead.'
      });
    }

    const log = await PMDailyLog.create({
      ...req.body,
      submittedBy: req.user._id
    });

    const populatedLog = await PMDailyLog.findById(log._id)
      .populate('projectId', 'projectNumber projectName')
      .populate('submittedBy', 'fullName email');

    res.status(201).json({
      success: true,
      data: populatedLog,
      message: 'Daily log submitted successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Daily log already exists for this project and date'
      });
    }
    next(error);
  }
};

/**
 * @desc    Update PM daily log
 * @route   PUT /api/fieldops/pm-logs/:id
 * @access  Private
 */
export const updatePMDailyLog = async (req, res, next) => {
  try {
    const log = await PMDailyLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ success: false, message: 'Log not found' });
    }

    // Check if log is locked
    if (log.shouldBeLocked() && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'This log is locked. Contact Admin to unlock.'
      });
    }

    // Check if user is the submitter or Admin
    if (log.submittedBy.toString() !== req.user._id.toString() &&
        !['Admin', 'Supervisor'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own logs'
      });
    }

    const updatedLog = await PMDailyLog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('projectId', 'projectNumber projectName')
      .populate('submittedBy', 'fullName email');

    res.json({
      success: true,
      data: updatedLog,
      message: 'Log updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lock PM daily log
 * @route   POST /api/fieldops/pm-logs/:id/lock
 * @access  Private (Admin)
 */
export const lockPMDailyLog = async (req, res, next) => {
  try {
    const log = await PMDailyLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ success: false, message: 'Log not found' });
    }

    await log.lock();

    res.json({ success: true, message: 'Log locked successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unlock PM daily log
 * @route   POST /api/fieldops/pm-logs/:id/unlock
 * @access  Private (Admin)
 */
export const unlockPMDailyLog = async (req, res, next) => {
  try {
    const log = await PMDailyLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ success: false, message: 'Log not found' });
    }

    await log.unlock(req.user._id);

    res.json({ success: true, message: 'Log unlocked successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload photos to PM daily log
 * @route   POST /api/fieldops/pm-logs/:id/photos
 * @access  Private
 */
export const uploadPMLogPhotos = async (req, res, next) => {
  try {
    const log = await PMDailyLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ success: false, message: 'Log not found' });
    }

    if (log.isLocked && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot add photos to a locked log'
      });
    }

    const files = req.files;
    const { photoType = 'Progress', captions } = req.body;
    const captionArray = captions ? JSON.parse(captions) : [];

    const uploadPromises = files.map(async (file, index) => {
      const isMemoryStorage = !!file.buffer;
      const result = await uploadToCloudinary(
        isMemoryStorage ? file.buffer : file.path,
        {
          folder: `fieldops/pm-logs/${log._id}`,
          resourceType: 'image',
          mimeType: file.mimetype
        }
      );

      return {
        url: result.url,
        publicId: result.publicId,
        caption: captionArray[index] || '',
        photoType,
        uploadedAt: new Date()
      };
    });

    const uploadedPhotos = await Promise.all(uploadPromises);
    log.photos.push(...uploadedPhotos);
    await log.save();

    res.json({
      success: true,
      data: log.photos,
      message: `${uploadedPhotos.length} photo(s) uploaded successfully`
    });
  } catch (error) {
    next(error);
  }
};

// ==================== DEVICE INSTALLATION CONTROLLERS ====================

/**
 * @desc    Get device installations
 * @route   GET /api/fieldops/devices
 * @access  Private
 */
export const getDeviceInstallations = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, projectId, zoneId, deviceType, status, isAssigned } = req.query;
    const query = {};

    if (projectId) query.projectId = projectId;
    if (zoneId) query.zoneId = zoneId;
    if (deviceType) query.deviceType = deviceType;
    if (status) query.status = status;
    if (isAssigned === 'true') {
      query.assignedTo = { $exists: true, $ne: null };
    } else if (isAssigned === 'false') {
      query.assignedTo = { $eq: null };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [devices, total] = await Promise.all([
      DeviceInstallation.find(query)
        .populate('projectId', 'projectNumber projectName')
        .populate('zoneId', 'zoneName zoneCode')
        .populate('installedBy', 'fullName')
        .populate('assignedTo', 'fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      DeviceInstallation.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: devices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single device
 * @route   GET /api/fieldops/devices/:id
 * @access  Private
 */
export const getDeviceInstallationById = async (req, res, next) => {
  try {
    const device = await DeviceInstallation.findById(req.params.id)
      .populate('projectId', 'projectNumber projectName')
      .populate('zoneId', 'zoneName zoneCode')
      .populate('installedBy', 'fullName email')
      .populate('testedBy', 'fullName email');

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    res.json({ success: true, data: device });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create device installation
 * @route   POST /api/fieldops/devices
 * @access  Private
 */
export const createDeviceInstallation = async (req, res, next) => {
  try {
    const { allocationId, cableAllocationId, cableDetails, quantity = 1 } = req.body;

    // If sourced from a project allocation, validate and deduct
    if (allocationId) {
      const allocation = await ProjectStockAllocation.findById(allocationId);
      if (!allocation) {
        return res.status(404).json({ success: false, message: 'Stock allocation not found' });
      }

      const remaining = allocation.allocatedQty - allocation.installedQty - allocation.faultyQty;
      if (quantity > remaining) {
        return res.status(400).json({
          success: false,
          message: `Cannot install ${quantity}. Only ${remaining} remaining in this allocation.`
        });
      }

      // Deduct from allocation
      allocation.installedQty += parseInt(quantity);
      await allocation.save(); // Pre-save hook auto-updates status
    }

    // If cable allocation is specified, validate and deduct cable length
    const cableLength = cableDetails?.length || cableDetails?.lengthMeters;
    if (cableAllocationId && cableLength) {
      const cableAllocation = await ProjectStockAllocation.findById(cableAllocationId);
      if (!cableAllocation) {
        return res.status(404).json({ success: false, message: 'Cable allocation not found' });
      }

      const parsedCableLength = parseFloat(cableLength);
      const remainingCable = cableAllocation.allocatedQty - cableAllocation.installedQty - cableAllocation.faultyQty;

      if (parsedCableLength > remainingCable) {
        return res.status(400).json({
          success: false,
          message: `Cannot use ${parsedCableLength}m cable. Only ${remainingCable}m remaining in this allocation.`
        });
      }

      // Deduct cable length from allocation
      cableAllocation.installedQty += parsedCableLength;
      await cableAllocation.save();
    }

    // Transform cableDetails to match schema (length -> lengthMeters, type -> cableType)
    const deviceData = { ...req.body };
    if (deviceData.cableDetails) {
      const rawCableType = deviceData.cableDetails.type || deviceData.cableDetails.cableType;
      const transformedCable = {
        lengthMeters: deviceData.cableDetails.length || deviceData.cableDetails.lengthMeters,
        cableType: normalizeCableType(rawCableType),
        trenchId: deviceData.cableDetails.trenchId
      };
      // Remove undefined/empty values
      Object.keys(transformedCable).forEach(key => {
        if (transformedCable[key] === undefined || transformedCable[key] === '' || transformedCable[key] === null) {
          delete transformedCable[key];
        }
      });
      // Only set cableDetails if it has valid data
      if (Object.keys(transformedCable).length > 0 && transformedCable.cableType) {
        deviceData.cableDetails = transformedCable;
      } else {
        delete deviceData.cableDetails;
      }
    }

    // Clean up networkDetails - remove empty values
    if (deviceData.networkDetails) {
      Object.keys(deviceData.networkDetails).forEach(key => {
        if (deviceData.networkDetails[key] === undefined || deviceData.networkDetails[key] === '' || deviceData.networkDetails[key] === null) {
          delete deviceData.networkDetails[key];
        }
      });
      if (Object.keys(deviceData.networkDetails).length === 0) {
        delete deviceData.networkDetails;
      }
    }

    // Clean up installationLocation - remove empty values
    if (deviceData.installationLocation) {
      Object.keys(deviceData.installationLocation).forEach(key => {
        if (deviceData.installationLocation[key] === undefined || deviceData.installationLocation[key] === '' || deviceData.installationLocation[key] === null) {
          delete deviceData.installationLocation[key];
        }
      });
      if (Object.keys(deviceData.installationLocation).length === 0) {
        delete deviceData.installationLocation;
      }
    }

    const device = await DeviceInstallation.create(deviceData);

    const populatedDevice = await DeviceInstallation.findById(device._id)
      .populate('projectId', 'projectNumber projectName')
      .populate('zoneId', 'zoneName zoneCode');

    res.status(201).json({
      success: true,
      data: populatedDevice,
      message: 'Device installation logged successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Normalize cable type name to match enum values
 */
const normalizeCableType = (cableType) => {
  if (!cableType) return null;

  const normalized = cableType.toUpperCase().replace(/\s+/g, '');

  // Map common variations to enum values
  const mappings = {
    'CAT5': 'CAT5',
    'CAT6': 'CAT6',
    'CAT6A': 'CAT6A',
    'FIBER': 'Fiber',
    'FIBRE': 'Fiber',
    'COAXIAL': 'Coaxial',
    'COAX': 'Coaxial',
    'POWER': 'Power',
    'OTHER': 'Other'
  };

  return mappings[normalized] || 'Other';
};

/**
 * @desc    Create multiple device installations (bulk)
 * @route   POST /api/fieldops/devices/bulk
 * @access  Private
 */
export const createBulkDeviceInstallations = async (req, res, next) => {
  try {
    const { devices } = req.body;

    if (!devices || !Array.isArray(devices) || devices.length === 0) {
      return res.status(400).json({ success: false, message: 'devices array is required' });
    }

    const createdDevices = [];
    const errors = [];
    const allocationsToUpdate = []; // Track allocations to update only after successful creation

    for (const rawDeviceData of devices) {
      try {
        const { allocationId, cableAllocationId, cableDetails, quantity = 1 } = rawDeviceData;
        const allocationUpdates = [];

        // If sourced from a project allocation, validate (but don't update yet)
        if (allocationId) {
          const allocation = await ProjectStockAllocation.findById(allocationId);
          if (!allocation) {
            errors.push({ device: rawDeviceData, error: 'Stock allocation not found' });
            continue;
          }

          const remaining = allocation.allocatedQty - allocation.installedQty - allocation.faultyQty;
          if (quantity > remaining) {
            errors.push({ device: rawDeviceData, error: `Cannot install ${quantity}. Only ${remaining} remaining.` });
            continue;
          }

          // Track for later update
          allocationUpdates.push({ allocation, field: 'installedQty', increment: parseInt(quantity) });
        }

        // If cable allocation is specified, validate (but don't update yet)
        const cableLength = cableDetails?.length || cableDetails?.lengthMeters;
        if (cableAllocationId && cableLength) {
          const cableAllocation = await ProjectStockAllocation.findById(cableAllocationId);
          if (cableAllocation) {
            const parsedCableLength = parseFloat(cableLength);
            const remainingCable = cableAllocation.allocatedQty - cableAllocation.installedQty - cableAllocation.faultyQty;

            if (parsedCableLength > remainingCable) {
              errors.push({ device: rawDeviceData, error: `Cable length ${parsedCableLength}m exceeds available ${remainingCable}m` });
              continue;
            }

            // Track for later update
            allocationUpdates.push({ allocation: cableAllocation, field: 'installedQty', increment: parsedCableLength });
          }
        }

        // Transform cableDetails to match schema (length -> lengthMeters, type -> cableType)
        const deviceData = { ...rawDeviceData };
        if (deviceData.cableDetails) {
          const rawCableType = deviceData.cableDetails.type || deviceData.cableDetails.cableType;
          const transformedCable = {
            lengthMeters: deviceData.cableDetails.length || deviceData.cableDetails.lengthMeters,
            cableType: normalizeCableType(rawCableType),
            trenchId: deviceData.cableDetails.trenchId
          };
          // Remove undefined/empty values
          Object.keys(transformedCable).forEach(key => {
            if (transformedCable[key] === undefined || transformedCable[key] === '' || transformedCable[key] === null) {
              delete transformedCable[key];
            }
          });
          // Only set cableDetails if it has valid data
          if (Object.keys(transformedCable).length > 0 && transformedCable.cableType) {
            deviceData.cableDetails = transformedCable;
          } else {
            delete deviceData.cableDetails;
          }
        }

        // Clean up networkDetails - remove empty values
        if (deviceData.networkDetails) {
          Object.keys(deviceData.networkDetails).forEach(key => {
            if (deviceData.networkDetails[key] === undefined || deviceData.networkDetails[key] === '' || deviceData.networkDetails[key] === null) {
              delete deviceData.networkDetails[key];
            }
          });
          if (Object.keys(deviceData.networkDetails).length === 0) {
            delete deviceData.networkDetails;
          }
        }

        // Clean up installationLocation - remove empty values
        if (deviceData.installationLocation) {
          Object.keys(deviceData.installationLocation).forEach(key => {
            if (deviceData.installationLocation[key] === undefined || deviceData.installationLocation[key] === '' || deviceData.installationLocation[key] === null) {
              delete deviceData.installationLocation[key];
            }
          });
          if (Object.keys(deviceData.installationLocation).length === 0) {
            delete deviceData.installationLocation;
          }
        }

        // Create the device - this will throw if validation fails
        const device = await DeviceInstallation.create(deviceData);
        createdDevices.push(device);

        // Only update allocations if device creation succeeded
        allocationsToUpdate.push(...allocationUpdates);
      } catch (err) {
        errors.push({ device: rawDeviceData, error: err.message });
      }
    }

    // Update all allocations for successfully created devices
    for (const { allocation, field, increment } of allocationsToUpdate) {
      allocation[field] += increment;
      await allocation.save();
    }

    res.status(201).json({
      success: true,
      data: createdDevices,
      errors: errors.length > 0 ? errors : undefined,
      message: `${createdDevices.length} device(s) installed successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update device installation
 * @route   PUT /api/fieldops/devices/:id
 * @access  Private
 */
export const updateDeviceInstallation = async (req, res, next) => {
  try {
    // Normalize cable type if present
    const updateData = { ...req.body };
    if (updateData.cableDetails && (updateData.cableDetails.type || updateData.cableDetails.cableType)) {
      const rawCableType = updateData.cableDetails.type || updateData.cableDetails.cableType;
      updateData.cableDetails.cableType = normalizeCableType(rawCableType);
      // Remove 'type' if it exists (only use cableType)
      delete updateData.cableDetails.type;
    }

    const device = await DeviceInstallation.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('projectId', 'projectNumber projectName')
      .populate('zoneId', 'zoneName zoneCode');

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    res.json({
      success: true,
      data: device,
      message: 'Device updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update device status
 * @route   PATCH /api/fieldops/devices/:id/status
 * @access  Private
 */
export const updateDeviceStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const deviceId = req.params.id;

    // Fetch device with project info for site determination
    const device = await DeviceInstallation.findById(deviceId)
      .populate('projectId', 'linkedSiteId siteAddress projectName')
      .populate({
        path: 'allocationId',
        populate: { path: 'stockItemId' }
      });

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    const updateData = { status };

    // Auto-set timestamps based on status
    if (status === 'Installed') {
      updateData.installedBy = req.user._id;
      updateData.installedAt = new Date();
    } else if (status === 'Tested') {
      updateData.testedBy = req.user._id;
      updateData.testedAt = new Date();
    } else if (status === 'Deployed') {
      // DEPLOYED: Device tested and confirmed OK
      // 1. Convert to operational Asset
      // 2. Update original stock item to remove "Spare" status
      if (!device.convertedToAsset) {
        try {
          const Asset = mongoose.model('Asset');
          const Site = mongoose.model('Site');

          // Determine siteId - use linkedSiteId from project or find/create based on address
          let siteId = device.projectId?.linkedSiteId;

          if (!siteId) {
            // Try to find site by project address
            const projectSite = await Site.findOne({
              siteName: { $regex: new RegExp(device.projectId?.siteAddress?.split(',')[0], 'i') },
              isActive: true
            });
            siteId = projectSite?._id;
          }

          if (siteId) {
            // Create operational asset from the installed device
            const assetCode = `AST-${Date.now()}-${device._id.toString().slice(-4)}`;

            const newAsset = await Asset.create({
              assetCode,
              assetType: device.assetType || device.deviceType,
              deviceType: device.deviceType,
              serialNumber: device.serialNumber || '',
              mac: device.mac || device.networkDetails?.macAddress || '',
              ipAddress: device.networkDetails?.ipAddress || '',
              make: device.make || '',
              model: device.model || '',
              siteId,
              locationDescription: device.installationLocation?.description || '',
              locationName: device.installationLocation?.zoneName || '',
              status: 'Operational',
              installationDate: device.installedAt || new Date(),
              criticality: 2,
              quantity: device.quantity || 1,
              remarks: `Deployed via FieldOps Project: ${device.projectId?.projectName || 'Unknown'}. Device ID: ${device._id}`
            });

            updateData.convertedToAsset = true;
            updateData.convertedAssetId = newAsset._id;

            // Update original stock item status from "Spare" to "Installed"
            if (device.allocationId?.stockItemId) {
              await Asset.findByIdAndUpdate(
                device.allocationId.stockItemId._id || device.allocationId.stockItemId,
                { status: 'Installed' }
              );
            }
          }
        } catch (assetError) {
          console.error('Error creating asset from device:', assetError);
          // Continue - don't fail the status update even if asset creation fails
        }
      }
    } else if (status === 'Faulty') {
      // Handle faulty device - increment faultyQty on allocation
      if (device.allocationId) {
        await ProjectStockAllocation.findByIdAndUpdate(
          device.allocationId._id || device.allocationId,
          { $inc: { faultyQty: device.quantity || 1 } }
        );
      }
    }

    const updatedDevice = await DeviceInstallation.findByIdAndUpdate(
      deviceId,
      updateData,
      { new: true }
    );

    res.json({
      success: true,
      data: updatedDevice,
      message: `Device status updated to ${status}${updateData.convertedToAsset ? ' and converted to operational Asset' : ''}`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get device summary for project
 * @route   GET /api/fieldops/devices/project/:projectId/summary
 * @access  Private
 */
export const getDeviceSummary = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const [byType, byStatus, byZone] = await Promise.all([
      // Count by device type
      DeviceInstallation.aggregate([
        { $match: { projectId: new mongoose.Types.ObjectId(projectId) } },
        { $group: { _id: '$deviceType', count: { $sum: 1 }, totalQty: { $sum: '$quantity' } } }
      ]),
      // Count by status
      DeviceInstallation.aggregate([
        { $match: { projectId: new mongoose.Types.ObjectId(projectId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // Count by zone
      DeviceInstallation.aggregate([
        { $match: { projectId: new mongoose.Types.ObjectId(projectId) } },
        {
          $lookup: {
            from: 'projectzones',
            localField: 'zoneId',
            foreignField: '_id',
            as: 'zone'
          }
        },
        { $unwind: { path: '$zone', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { zoneId: '$zoneId', zoneName: '$zone.zoneName' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        byType: byType.reduce((acc, t) => ({ ...acc, [t._id]: { count: t.count, totalQty: t.totalQty } }), {}),
        byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        byZone: byZone.map(z => ({ zoneId: z._id.zoneId, zoneName: z._id.zoneName || 'Unassigned', count: z.count })),
        total: byStatus.reduce((sum, s) => sum + s.count, 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== VENDOR WORK LOG CONTROLLERS ====================

/**
 * @desc    Get vendor work logs
 * @route   GET /api/fieldops/vendor-logs
 * @access  Private
 */
export const getVendorWorkLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, projectId, vendorId, labourType, startDate, endDate } = req.query;
    const query = {};

    if (projectId) query.projectId = projectId;
    if (vendorId) query.vendorId = vendorId;
    if (labourType) query.labourType = labourType;
    if (startDate && endDate) {
      query.logDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      VendorWorkLog.find(query)
        .populate('projectId', 'projectNumber projectName')
        .populate('vendorId', 'fullName email companyName')
        .populate('submittedBy', 'fullName')
        .sort({ logDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      VendorWorkLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single vendor work log
 * @route   GET /api/fieldops/vendor-logs/:id
 * @access  Private
 */
export const getVendorWorkLogById = async (req, res, next) => {
  try {
    const log = await VendorWorkLog.findById(req.params.id)
      .populate('projectId', 'projectNumber projectName')
      .populate('vendorId', 'fullName email companyName')
      .populate('submittedBy', 'fullName email');

    if (!log) {
      return res.status(404).json({ success: false, message: 'Vendor log not found' });
    }

    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create vendor work log
 * @route   POST /api/fieldops/vendor-logs
 * @access  Private
 */
export const createVendorWorkLog = async (req, res, next) => {
  try {
    const log = await VendorWorkLog.create({
      ...req.body,
      submittedBy: req.user._id
    });

    const populatedLog = await VendorWorkLog.findById(log._id)
      .populate('projectId', 'projectNumber projectName')
      .populate('vendorId', 'fullName');

    res.status(201).json({
      success: true,
      data: populatedLog,
      message: 'Vendor work log submitted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update vendor work log
 * @route   PUT /api/fieldops/vendor-logs/:id
 * @access  Private
 */
export const updateVendorWorkLog = async (req, res, next) => {
  try {
    const log = await VendorWorkLog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('projectId', 'projectNumber projectName')
      .populate('vendorId', 'fullName');

    if (!log) {
      return res.status(404).json({ success: false, message: 'Vendor log not found' });
    }

    res.json({
      success: true,
      data: log,
      message: 'Vendor log updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get my vendor logs (for assigned vendor)
 * @route   GET /api/fieldops/vendor-logs/my-logs
 * @access  Private
 */
export const getMyVendorLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find projects where user is assigned as vendor
    const vendorProjects = await Project.find({
      isActive: true,
      assignedVendors: req.user._id
    }).select('_id');

    const projectIds = vendorProjects.map(p => p._id);

    const [logs, total] = await Promise.all([
      VendorWorkLog.find({
        $or: [
          { vendorId: req.user._id },
          { submittedBy: req.user._id },
          { projectId: { $in: projectIds } }
        ]
      })
        .populate('projectId', 'projectNumber projectName')
        .sort({ logDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      VendorWorkLog.countDocuments({
        $or: [
          { vendorId: req.user._id },
          { submittedBy: req.user._id },
          { projectId: { $in: projectIds } }
        ]
      })
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== CHALLENGE LOG CONTROLLERS ====================

/**
 * @desc    Get challenge logs
 * @route   GET /api/fieldops/challenges
 * @access  Private
 */
export const getChallengeLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, projectId, issueType, severity, resolutionStatus } = req.query;
    const query = {};

    if (projectId) query.projectId = projectId;
    if (issueType) query.issueType = issueType;
    if (severity) query.severity = severity;
    if (resolutionStatus) query.resolutionStatus = resolutionStatus;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [challenges, total] = await Promise.all([
      ChallengeLog.find(query)
        .populate('projectId', 'projectNumber projectName')
        .populate('reportedBy', 'fullName')
        .populate('assignedTo', 'fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ChallengeLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: challenges,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single challenge log
 * @route   GET /api/fieldops/challenges/:id
 * @access  Private
 */
export const getChallengeLogById = async (req, res, next) => {
  try {
    const challenge = await ChallengeLog.findById(req.params.id)
      .populate('projectId', 'projectNumber projectName')
      .populate('reportedBy', 'fullName email')
      .populate('assignedTo', 'fullName email')
      .populate('resolvedBy', 'fullName')
      .populate('escalatedBy', 'fullName')
      .populate('comments.commentedBy', 'fullName');

    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }

    res.json({ success: true, data: challenge });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create challenge log
 * @route   POST /api/fieldops/challenges
 * @access  Private
 */
export const createChallengeLog = async (req, res, next) => {
  try {
    const challengeData = {
      ...req.body,
      reportedBy: req.user._id,
      reportedAt: new Date()
    };

    // If escalating, set escalation info
    if (req.body.escalateToAdmin) {
      challengeData.escalatedBy = req.user._id;
      challengeData.escalatedAt = new Date();
    }

    const challenge = await ChallengeLog.create(challengeData);

    const populatedChallenge = await ChallengeLog.findById(challenge._id)
      .populate('projectId', 'projectNumber projectName')
      .populate('reportedBy', 'fullName');

    res.status(201).json({
      success: true,
      data: populatedChallenge,
      message: 'Challenge reported successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update challenge log
 * @route   PUT /api/fieldops/challenges/:id
 * @access  Private
 */
export const updateChallengeLog = async (req, res, next) => {
  try {
    // If newly escalating, set escalation info
    if (req.body.escalateToAdmin) {
      const existingChallenge = await ChallengeLog.findById(req.params.id);
      if (!existingChallenge.escalateToAdmin) {
        req.body.escalatedBy = req.user._id;
        req.body.escalatedAt = new Date();
      }
    }

    const challenge = await ChallengeLog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('projectId', 'projectNumber projectName')
      .populate('reportedBy', 'fullName');

    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }

    res.json({
      success: true,
      data: challenge,
      message: 'Challenge updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resolve challenge log
 * @route   POST /api/fieldops/challenges/:id/resolve
 * @access  Private
 */
export const resolveChallengeLog = async (req, res, next) => {
  try {
    const challenge = await ChallengeLog.findByIdAndUpdate(
      req.params.id,
      {
        resolutionStatus: 'Resolved',
        resolution: req.body.resolution,
        resolvedBy: req.user._id,
        resolvedAt: new Date()
      },
      { new: true }
    );

    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }

    res.json({
      success: true,
      data: challenge,
      message: 'Challenge marked as resolved'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get escalated challenges
 * @route   GET /api/fieldops/challenges/escalated
 * @access  Private (Admin, Supervisor)
 */
export const getEscalatedChallenges = async (req, res, next) => {
  try {
    const challenges = await ChallengeLog.find({
      escalateToAdmin: true,
      resolutionStatus: { $in: ['Open', 'InProgress'] }
    })
      .populate('projectId', 'projectNumber projectName')
      .populate('reportedBy', 'fullName')
      .sort({ severity: -1, createdAt: -1 });

    res.json({ success: true, data: challenges });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add comment to challenge
 * @route   POST /api/fieldops/challenges/:id/comments
 * @access  Private
 */
export const addChallengeComment = async (req, res, next) => {
  try {
    const challenge = await ChallengeLog.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }

    challenge.comments.push({
      text: req.body.text,
      commentedBy: req.user._id,
      commentedAt: new Date()
    });

    await challenge.save();

    const updatedChallenge = await ChallengeLog.findById(req.params.id)
      .populate('comments.commentedBy', 'fullName');

    res.json({
      success: true,
      data: updatedChallenge.comments,
      message: 'Comment added successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==================== REPORT CONTROLLERS ====================

/**
 * @desc    Get project report data
 * @route   GET /api/fieldops/reports/project/:id
 * @access  Private (Admin, Supervisor)
 */
export const getProjectReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const projectId = req.params.id;

    const project = await Project.findById(projectId)
      .populate('assignedPM', 'fullName email phone')
      .populate('teamMembers', 'fullName')
      .populate('assignedVendors', 'fullName companyName');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.logDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const [dailyLogs, devices, vendorLogs, challenges, zones] = await Promise.all([
      PMDailyLog.find({ projectId, ...dateFilter })
        .populate('submittedBy', 'fullName')
        .sort({ logDate: -1 }),
      DeviceInstallation.find({ projectId })
        .populate('zoneId', 'zoneName'),
      VendorWorkLog.find({ projectId, ...dateFilter })
        .populate('vendorId', 'fullName companyName')
        .sort({ logDate: -1 }),
      ChallengeLog.find({ projectId })
        .populate('reportedBy', 'fullName'),
      ProjectZone.find({ projectId, isActive: true })
    ]);

    // Calculate summaries
    const summary = {
      totalManHours: dailyLogs.reduce((sum, log) => sum + (log.manHours || 0), 0),
      avgProgress: dailyLogs.length > 0
        ? Math.round(dailyLogs.reduce((sum, log) => sum + (log.progressPercentage || 0), 0) / dailyLogs.length)
        : 0,
      latestProgress: dailyLogs[0]?.progressPercentage || 0,
      totalDevices: devices.length,
      devicesByStatus: devices.reduce((acc, d) => {
        acc[d.status] = (acc[d.status] || 0) + 1;
        return acc;
      }, {}),
      totalVendorLogs: vendorLogs.length,
      totalTrenchLength: vendorLogs.reduce((sum, log) => sum + (log.areaWorked?.lengthMeters || 0), 0),
      totalChallenges: challenges.length,
      openChallenges: challenges.filter(c => c.resolutionStatus === 'Open').length,
      criticalChallenges: challenges.filter(c => c.severity === 'Critical').length
    };

    res.json({
      success: true,
      data: {
        project,
        summary,
        zones,
        dailyLogs,
        devices,
        vendorLogs,
        challenges
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export project report as PDF
 * @route   GET /api/fieldops/reports/project/:id/export/pdf
 * @access  Private (Admin, Supervisor)
 */
export const exportProjectReportPDF = async (req, res, next) => {
  try {
    // This will be implemented with pdfkit
    res.status(501).json({
      success: false,
      message: 'PDF export not yet implemented. Install pdfkit: npm install pdfkit'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export project report as Excel
 * @route   GET /api/fieldops/reports/project/:id/export/excel
 * @access  Private (Admin, Supervisor)
 */
export const exportProjectReportExcel = async (req, res, next) => {
  try {
    // This will be implemented with exceljs
    res.status(501).json({
      success: false,
      message: 'Excel export not yet implemented. Install exceljs: npm install exceljs'
    });
  } catch (error) {
    next(error);
  }
};

// ==================== DEVICE ASSIGNMENT CONTROLLERS ====================

/**
 * @desc    Get devices awaiting assignment (status: Installed, not assigned)
 * @route   GET /api/fieldops/devices/awaiting-assignment
 * @access  Private (Admin, Supervisor, PM)
 */
export const getDevicesAwaitingAssignment = async (req, res, next) => {
  try {
    const { projectId, deviceType } = req.query;

    const filter = {
      status: 'Installed',
      assignedTo: { $exists: false }
    };

    if (projectId) {
      filter.projectId = projectId;
    }

    if (deviceType) {
      filter.deviceType = deviceType;
    }

    // For non-admin/supervisor, only show devices from their assigned projects
    if (!['Admin', 'Supervisor'].includes(req.user.role)) {
      const userProjects = await Project.find({
        $or: [
          { assignedPM: req.user._id },
          { teamMembers: req.user._id }
        ],
        isActive: true
      }).select('_id');

      filter.projectId = { $in: userProjects.map(p => p._id) };
    }

    const devices = await DeviceInstallation.find(filter)
      .populate('projectId', 'projectNumber projectName')
      .populate('zoneId', 'zoneName')
      .populate('installedBy', 'fullName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: devices, total: devices.length });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get devices assigned to a specific user
 * @route   GET /api/fieldops/devices/my-assignments
 * @access  Private
 */
export const getMyDeviceAssignments = async (req, res, next) => {
  try {
    const { projectId, status } = req.query;

    const filter = {
      assignedTo: req.user._id
    };

    if (projectId) {
      filter.projectId = projectId;
    }

    if (status) {
      filter.status = status;
    } else {
      // By default, show devices that are assigned but not yet deployed
      filter.status = { $in: ['Installed', 'Configured', 'Tested'] };
    }

    const devices = await DeviceInstallation.find(filter)
      .populate('projectId', 'projectNumber projectName')
      .populate('zoneId', 'zoneName')
      .populate('assignedBy', 'fullName')
      .sort({ assignedAt: -1 });

    res.json({ success: true, data: devices, total: devices.length });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign device to an engineer for configuration/testing
 * @route   POST /api/fieldops/devices/:id/assign
 * @access  Private (Admin, Supervisor, PM)
 */
export const assignDeviceToEngineer = async (req, res, next) => {
  try {
    const { engineerId, notes } = req.body;
    const deviceId = req.params.id;

    const device = await DeviceInstallation.findById(deviceId)
      .populate('projectId');

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    // Check if user can assign devices in this project
    const project = device.projectId;
    if (!['Admin', 'Supervisor'].includes(req.user.role)) {
      if (!isAssignedPM(req.user, project) && !project.teamMembers?.some(tm => tm.toString() === req.user._id.toString())) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to assign devices in this project'
        });
      }
    }

    // Update device assignment
    device.assignedTo = engineerId;
    device.assignedBy = req.user._id;
    device.assignedAt = new Date();

    if (notes) {
      device.notes = device.notes ? `${device.notes}\n\nAssignment Notes: ${notes}` : `Assignment Notes: ${notes}`;
    }

    await device.save();

    const updatedDevice = await DeviceInstallation.findById(deviceId)
      .populate('projectId', 'projectNumber projectName')
      .populate('zoneId', 'zoneName')
      .populate('assignedTo', 'fullName email')
      .populate('assignedBy', 'fullName');

    // Send email notification to assigned engineer
    if (updatedDevice.assignedTo && updatedDevice.assignedTo.email) {
      try {
        await sendDeviceAssignmentEmail(
          updatedDevice,
          updatedDevice.assignedTo,
          req.user,
          updatedDevice.projectId
        );
      } catch (emailError) {
        console.error('Failed to send device assignment email:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({
      success: true,
      data: updatedDevice,
      message: 'Device assigned successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk assign multiple devices to an engineer
 * @route   POST /api/fieldops/devices/bulk-assign
 * @access  Private (Admin, Supervisor, PM)
 */
export const bulkAssignDevices = async (req, res, next) => {
  try {
    const { deviceIds, engineerId, notes } = req.body;

    if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide device IDs to assign'
      });
    }

    if (!engineerId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide engineer ID to assign to'
      });
    }

    const assignmentData = {
      assignedTo: engineerId,
      assignedBy: req.user._id,
      assignedAt: new Date()
    };

    const result = await DeviceInstallation.updateMany(
      {
        _id: { $in: deviceIds },
        status: 'Installed',
        assignedTo: { $exists: false }
      },
      { $set: assignmentData }
    );

    // Send email notifications for assigned devices
    if (result.modifiedCount > 0) {
      try {
        const User = mongoose.model('User');
        const assignedUser = await User.findById(engineerId);

        if (assignedUser && assignedUser.email) {
          // Fetch the assigned devices
          const assignedDevices = await DeviceInstallation.find({
            _id: { $in: deviceIds },
            assignedTo: engineerId
          })
            .populate('projectId', 'projectNumber projectName')
            .populate('zoneId', 'zoneName')
            .limit(10); // Limit to avoid overwhelming emails

          // Send email for each device (or send a summary email if many)
          for (const device of assignedDevices) {
            try {
              await sendDeviceAssignmentEmail(
                device,
                assignedUser,
                req.user,
                device.projectId
              );
            } catch (emailError) {
              console.error(`Failed to send email for device ${device._id}:`, emailError);
            }
          }
        }
      } catch (emailError) {
        console.error('Failed to send bulk assignment emails:', emailError);
        // Don't fail the request if emails fail
      }
    }

    res.json({
      success: true,
      data: {
        assignedCount: result.modifiedCount,
        requestedCount: deviceIds.length
      },
      message: `${result.modifiedCount} devices assigned successfully`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Skip configuration for non-IT/passive items and convert directly to asset
 * @route   POST /api/fieldops/devices/:id/skip-config
 * @access  Private (Admin, Supervisor, PM)
 */
export const skipDeviceConfiguration = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const deviceId = req.params.id;

    const device = await DeviceInstallation.findById(deviceId)
      .populate('projectId');

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    // Check if user can manage devices in this project
    const project = device.projectId;
    if (!['Admin', 'Supervisor'].includes(req.user.role)) {
      if (!isAssignedPM(req.user, project) && !project.teamMembers?.some(tm => tm.toString() === req.user._id.toString())) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to manage devices in this project'
        });
      }
    }

    // Mark as configuration not required
    device.requiresConfiguration = false;
    device.configurationSkippedBy = req.user._id;
    device.configurationSkippedAt = new Date();
    device.configurationSkipReason = reason || 'Non-IT/passive item';

    // Change status to Deployed (skip configuration/testing)
    device.status = 'Deployed';

    await device.save();

    // Create asset from this device (similar to updateDeviceStatus with 'Deployed')
    const Asset = mongoose.model('Asset');
    const assetData = {
      assetType: device.assetType || device.deviceType,
      deviceType: device.deviceType,
      manufacturer: device.make || '',
      model: device.model || '',
      serialNumber: device.serialNumber || '',
      mac: device.mac || '',
      purchaseDate: device.installedAt || new Date(),
      status: 'Active',
      siteId: project.linkedSiteId,
      notes: `Auto-created from Field Ops device installation (config skipped).\nProject: ${project.projectNumber}\nReason: ${reason || 'Non-IT/passive item'}`,
      installationDetails: {
        location: device.installationLocation?.description || '',
        floor: device.installationLocation?.floorLevel || '',
        poleWallId: device.installationLocation?.poleWallId || ''
      }
    };

    // Only add network info if present
    if (device.networkDetails?.ipAddress) {
      assetData.networkInfo = {
        ipAddress: device.networkDetails.ipAddress,
        macAddress: device.networkDetails.macAddress || device.mac,
        subnet: device.networkDetails.subnet,
        gateway: device.networkDetails.gateway
      };
    }

    const asset = await Asset.create(assetData);

    // Update device with asset reference
    device.convertedToAsset = true;
    device.convertedAssetId = asset._id;
    await device.save();

    // Update source stock item status from Spare to Installed
    if (device.allocationId) {
      const allocation = await ProjectStockAllocation.findById(device.allocationId)
        .populate('stockItemId');

      if (allocation && allocation.stockItemId) {
        const Stock = mongoose.model('Stock');
        await Stock.findByIdAndUpdate(allocation.stockItemId._id, {
          status: 'Installed',
          notes: `Installed at ${project.projectName} (${project.projectNumber}) - config skipped`
        });
      }
    }

    const updatedDevice = await DeviceInstallation.findById(deviceId)
      .populate('projectId', 'projectNumber projectName')
      .populate('configurationSkippedBy', 'fullName')
      .populate('convertedAssetId', 'assetType deviceType status');

    res.json({
      success: true,
      data: {
        device: updatedDevice,
        asset: asset
      },
      message: 'Configuration skipped and device converted to asset'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unassign device (remove assignment)
 * @route   POST /api/fieldops/devices/:id/unassign
 * @access  Private (Admin, Supervisor, PM)
 */
export const unassignDevice = async (req, res, next) => {
  try {
    const deviceId = req.params.id;

    const device = await DeviceInstallation.findById(deviceId)
      .populate('projectId');

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    // Check if user can manage devices in this project
    const project = device.projectId;
    if (!['Admin', 'Supervisor'].includes(req.user.role)) {
      if (!isAssignedPM(req.user, project) && !project.teamMembers?.some(tm => tm.toString() === req.user._id.toString())) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to manage devices in this project'
        });
      }
    }

    // Remove assignment
    device.assignedTo = undefined;
    device.assignedBy = undefined;
    device.assignedAt = undefined;

    await device.save();

    res.json({
      success: true,
      data: device,
      message: 'Device unassigned successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Export constants for frontend reference
export const constants = {
  ProjectStatuses,
  PhotoTypes,
  DeviceTypes,
  InstallationStatuses,
  LabourTypes,
  TrenchStatuses,
  IssueTypes,
  Severities,
  ResolutionStatuses
};
