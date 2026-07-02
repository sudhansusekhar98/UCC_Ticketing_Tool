import mongoose from 'mongoose';
import Activity, { ActivityStatuses } from '../models/Activity.model.js';
import Project from '../models/Project.model.js';
import User from '../models/User.model.js';
import { getTaskTemplates, ACTIVITY_TASK_TEMPLATES } from '../constants/activityTaskTemplates.js';
import { sendActivityAssignmentEmail } from '../utils/email.utils.js';

// ==================== HELPERS ====================

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const canAccessProject = (user, project) => {
  if (['Admin', 'Supervisor'].includes(user.role)) return true;
  const uid = user._id.toString();
  if (project.assignedPM && project.assignedPM.toString() === uid) return true;
  if (project.teamMembers?.some(tm => tm.toString() === uid)) return true;
  if (project.assignedVendors?.some(v => v.toString() === uid)) return true;
  return false;
};

const isPMorAdmin = (user, project) => {
  if (['Admin', 'Supervisor'].includes(user.role)) return true;
  return project.assignedPM && project.assignedPM.toString() === user._id.toString();
};

const canEditActivity = (user, activity, project) => {
  if (isPMorAdmin(user, project)) return true;
  if (activity.leadEngineer && activity.leadEngineer.toString() === user._id.toString()) return true;
  return false;
};

const canExecuteActivity = (user, activity, project) => {
  if (canEditActivity(user, activity, project)) return true;
  const uid = user._id.toString();
  if (activity.assignees?.some(a => a.toString() === uid)) return true;
  return false;
};

const loadProjectOr404 = async (projectId, res) => {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    res.status(400).json({ success: false, message: 'Invalid project ID' });
    return null;
  }
  const project = await Project.findById(projectId);
  if (!project || !project.isActive) {
    res.status(404).json({ success: false, message: 'Project not found' });
    return null;
  }
  return project;
};

// ==================== MY ACTIVITIES ====================

/**
 * @desc  Get all activities assigned to the current user (cross-project)
 * @route GET /api/fieldops/activities/my-activities
 */
export const getMyActivities = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const activities = await Activity.find({
      isActive: true,
      $or: [{ leadEngineer: userId }, { assignees: userId }]
    })
      .populate('projectId', 'projectName projectNumber status city')
      .populate('leadEngineer', 'fullName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: activities });
  } catch (err) { next(err); }
};

// ==================== CRUD ====================

/**
 * @desc  List activities for a project (supports kanban grouping)
 * @route GET /api/fieldops/projects/:projectId/activities
 */
export const getProjectActivities = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, type, leadEngineer, groupByStatus, search } = req.query;

    const project = await loadProjectOr404(projectId, res);
    if (!project) return;
    if (!canAccessProject(req.user, project)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const query = { projectId, isActive: true };
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      query.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
    }
    if (type) query.type = type;
    if (leadEngineer) query.leadEngineer = leadEngineer;
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { title: new RegExp(safeSearch, 'i') },
        { activityNumber: new RegExp(safeSearch, 'i') }
      ];
    }

    const activities = await Activity.find(query)
      .populate('leadEngineer', 'fullName email')
      .populate('assignees', 'fullName email')
      .sort({ createdAt: -1 });

    if (groupByStatus === 'true') {
      const board = { ToDo: [], InProgress: [], Review: [], Done: [], Blocked: [] };
      activities.forEach(a => { board[a.status]?.push(a); });
      return res.json({ success: true, data: board });
    }

    res.json({ success: true, data: activities });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Get single activity
 * @route GET /api/fieldops/activities/:id
 */
export const getProjectActivityById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid activity ID' });
    }

    const activity = await Activity.findById(id)
      .populate('leadEngineer', 'fullName email')
      .populate('assignees', 'fullName email')
      .populate('projectId', 'projectName projectNumber assignedPM teamMembers assignedVendors');

    if (!activity || !activity.isActive) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    if (!canAccessProject(req.user, activity.projectId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.json({ success: true, data: activity });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Create an activity under a project
 * @route POST /api/fieldops/projects/:projectId/activities
 */
export const createProjectActivity = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await loadProjectOr404(projectId, res);
    if (!project) return;
    if (!isPMorAdmin(req.user, project)) {
      return res.status(403).json({ success: false, message: 'Only PM, Admin or Supervisor can create activities' });
    }

    const {
      title, description, type, priority,
      leadEngineer, assignees,
      requiredDevices, requiredStockItems,
      tasks, plannedStart, plannedEnd
    } = req.body;

    if (!title || !leadEngineer) {
      return res.status(400).json({ success: false, message: 'title and leadEngineer are required' });
    }

    const activity = await Activity.create({
      projectId,
      title,
      description,
      type: type || 'Technical',
      priority: priority || 'Med',
      leadEngineer,
      assignees: assignees || [],
      requiredDevices: requiredDevices || [],
      requiredStockItems: requiredStockItems || [],
      tasks: (tasks || []).map((t, idx) => ({
        title: typeof t === 'string' ? t : t.title,
        order: typeof t === 'string' ? idx : (t.order ?? idx)
      })),
      plannedStart,
      plannedEnd,
      createdBy: req.user._id
    });

    const populated = await Activity.findById(activity._id)
      .populate('leadEngineer', 'fullName email')
      .populate('assignees', 'fullName email');

    const usersToNotify = [populated.leadEngineer, ...(populated.assignees || [])].filter(Boolean);
    sendActivityAssignmentEmail(
      populated,
      { projectName: project.projectName, projectNumber: project.projectNumber },
      usersToNotify
    ).catch(() => {});

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Update activity
 * @route PUT /api/fieldops/activities/:id
 */
export const updateProjectActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const activity = await Activity.findById(id).populate('projectId');
    if (!activity || !activity.isActive) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }
    if (!canEditActivity(req.user, activity, activity.projectId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const oldAssigneeIds = new Set((activity.assignees || []).map(a => a.toString()));

    const editableFields = [
      'title', 'description', 'type', 'priority', 'status',
      'leadEngineer', 'assignees',
      'requiredDevices', 'requiredStockItems',
      'plannedStart', 'plannedEnd', 'progressPercentage'
    ];
    editableFields.forEach(f => {
      if (req.body[f] !== undefined) activity[f] = req.body[f];
    });

    await activity.save();

    const populated = await Activity.findById(activity._id)
      .populate('leadEngineer', 'fullName email')
      .populate('assignees', 'fullName email');

    const newAssigneeIds = (req.body.assignees || []).filter(aid => !oldAssigneeIds.has(aid.toString()));
    if (newAssigneeIds.length) {
      const newUsers = await User.find({ _id: { $in: newAssigneeIds } }).select('fullName email');
      sendActivityAssignmentEmail(
        populated,
        { projectName: activity.projectId.projectName, projectNumber: activity.projectId.projectNumber },
        newUsers
      ).catch(() => {});
    }

    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Update activity status (kanban drag-drop)
 * @route PATCH /api/fieldops/activities/:id/status
 */
export const updateProjectActivityStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!Object.values(ActivityStatuses).includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const activity = await Activity.findById(id).populate('projectId');
    if (!activity || !activity.isActive) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }
    if (!canEditActivity(req.user, activity, activity.projectId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    activity.status = status;
    await activity.save();

    res.json({ success: true, data: activity });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Toggle / update a sub-task on an activity
 * @route PATCH /api/fieldops/activities/:id/tasks/:taskId
 */
export const updateProjectActivityTask = async (req, res, next) => {
  try {
    const { id, taskId } = req.params;
    const { done, title, order, notes } = req.body;

    const activity = await Activity.findById(id).populate('projectId');
    if (!activity || !activity.isActive) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }
    if (!canExecuteActivity(req.user, activity, activity.projectId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const task = activity.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (done !== undefined) {
      task.done = !!done;
      task.doneBy = done ? req.user._id : undefined;
      task.doneAt = done ? new Date() : undefined;
    }
    if (title !== undefined) task.title = title;
    if (order !== undefined) task.order = order;
    if (notes !== undefined) task.notes = notes;

    await activity.save();
    res.json({ success: true, data: activity });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Add a sub-task to an activity
 * @route POST /api/fieldops/activities/:id/tasks
 */
export const addProjectActivityTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    const activity = await Activity.findById(id).populate('projectId');
    if (!activity || !activity.isActive) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }
    if (!canEditActivity(req.user, activity, activity.projectId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    activity.tasks.push({ title, order: activity.tasks.length });
    await activity.save();
    res.status(201).json({ success: true, data: activity });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Remove a sub-task
 * @route DELETE /api/fieldops/activities/:id/tasks/:taskId
 */
export const deleteProjectActivityTask = async (req, res, next) => {
  try {
    const { id, taskId } = req.params;
    const activity = await Activity.findById(id).populate('projectId');
    if (!activity || !activity.isActive) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }
    if (!canEditActivity(req.user, activity, activity.projectId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const task = activity.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    task.deleteOne();
    await activity.save();
    res.json({ success: true, data: activity });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Soft-delete activity
 * @route DELETE /api/fieldops/activities/:id
 */
export const deleteProjectActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const activity = await Activity.findById(id).populate('projectId');
    if (!activity || !activity.isActive) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }
    if (!isPMorAdmin(req.user, activity.projectId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    activity.isActive = false;
    activity.deletedAt = new Date();
    await activity.save();

    res.json({ success: true, message: 'Activity deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Suggested sub-tasks by activity type (Create Activity chips)
 * @route GET /api/fieldops/activities/task-suggestions
 */
export const getActivityTaskSuggestions = async (req, res) => {
  const { type } = req.query;
  if (type) {
    return res.json({ success: true, data: getTaskTemplates(type) });
  }
  res.json({ success: true, data: ACTIVITY_TASK_TEMPLATES });
};

/**
 * @desc  Prefill for activity-driven daily log form: returns the project's
 *        open activities so the Submit Daily Activity screen can render a
 *        per-activity progress checklist.
 * @route GET /api/fieldops/projects/:projectId/daily-log/prefill
 */
export const getDailyLogPrefill = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await loadProjectOr404(projectId, res);
    if (!project) return;
    if (!canAccessProject(req.user, project)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const activities = await Activity.find({
      projectId,
      isActive: true,
      status: { $in: ['ToDo', 'InProgress', 'Review', 'Blocked'] }
    })
      .populate('leadEngineer', 'fullName')
      .sort({ createdAt: 1 });

    res.json({ success: true, data: activities });
  } catch (err) {
    next(err);
  }
};
