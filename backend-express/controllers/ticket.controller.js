import mongoose from 'mongoose';
import Ticket from '../models/Ticket.model.js';
import User from '../models/User.model.js';
import Asset from '../models/Asset.model.js';
import TicketActivity from '../models/TicketActivity.model.js';
import SLAPolicy from '../models/SLAPolicy.model.js';
import { sendTicketAssignmentEmail, sendTicketEscalationEmail, sendGeneralNotificationEmail } from '../utils/email.utils.js';
import DailyWorkLog from '../models/DailyWorkLog.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createSystemNotification } from './notification.controller.js';

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Get all tickets
// @route   GET /api/tickets
// @access  Private
export const getTickets = asyncHandler(async (req, res, next) => {
  const {
    status, priority, category, siteId, assetId, assignedTo, createdBy,
    search, page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc',
    isSLABreached, isEscalated, slaStatus, startDate, endDate
  } = req.query;

  const query = {};

  // Role-based filtering
  const user = req.user;

  // SiteClient: only sees their own tickets
  if (user.role === 'SiteClient') {
    query.createdBy = user._id;
  } else if (user.role !== 'Admin') {
    // Normal users see tickets assigned to them, created by them, or in their assigned sites
    query.$or = [
      { assignedTo: user._id },
      { createdBy: user._id },
      { siteId: { $in: user.assignedSites || [] } }
    ];
  }

  if (status) {
    if (status.includes(',')) {
      query.status = { $in: status.split(',') };
    } else {
      query.status = status;
    }
  }
  if (priority) query.priority = priority;
  if (category) query.category = category;
  if (siteId) query.siteId = siteId;
  if (assetId) query.assetId = assetId;
  if (assignedTo) query.assignedTo = assignedTo;
  if (createdBy) query.createdBy = createdBy;

  // Date range filter on createdAt
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
    }
    if (endDate) {
      query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }
  }

  // SLA Status filter
  if (isSLABreached === 'true') {
    query.isSLARestoreBreached = true;
    query.status = { $nin: ['Closed', 'Cancelled'] };
  }

  // Escalated tickets filter
  if (isEscalated === 'true') {
    query.escalationLevel = { $gt: 0 };
    query.status = { $nin: ['Closed', 'Cancelled', 'Verified'] };
  }

  if (slaStatus) {
    if (slaStatus === 'Breached') {
      query.isSLARestoreBreached = true;
      query.status = { $nin: ['Closed', 'Cancelled'] };
    } else if (slaStatus === 'AtRisk') {
      query.slaRestoreDue = { $lte: new Date(Date.now() + 4 * 60 * 60 * 1000), $gt: new Date() };
      query.isSLARestoreBreached = { $ne: true };
      query.status = { $nin: ['Closed', 'Cancelled', 'Resolved'] };
    } else if (slaStatus === 'Issues') {
      // Breached OR At Risk - all tickets with SLA problems
      query.status = { $nin: ['Closed', 'Cancelled'] };
      query.$or = [
        { isSLARestoreBreached: true },
        { slaRestoreDue: { $lte: new Date(Date.now() + 4 * 60 * 60 * 1000), $gt: new Date() }, isSLARestoreBreached: { $ne: true } }
      ];
    } else if (slaStatus === 'OnTrack') {
      query.$and = query.$and || [];
      query.$and.push(
        {
          $or: [
            { isSLARestoreBreached: { $ne: true } },
            { isSLARestoreBreached: { $exists: false } }
          ]
        },
        {
          $or: [
            { slaRestoreDue: { $gt: new Date(Date.now() + 30 * 60 * 1000) } },
            { slaRestoreDue: { $exists: false } }
          ]
        }
      );
      query.status = { $nin: ['Closed', 'Cancelled'] };
    }
  }

  if (search) {
    const searchRegex = { $regex: escapeRegex(search), $options: 'i' };
    const searchCriteria = [
      { ticketNumber: searchRegex },
      { title: searchRegex },
      { description: searchRegex }
    ];

    if (query.$or) {
      // If we already have an $or (for scope), we need to maintain it AND matches search
      // (ScopeA OR ScopeB) AND (SearchA OR SearchB)
      // MongoDB doesn't support implicit AND with top-level $or easily in this structure without $and
      query.$and = [
        { $or: query.$or },
        { $or: searchCriteria }
      ];
      delete query.$or;
    } else {
      query.$or = searchCriteria;
    }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [tickets, total] = await Promise.all([
    Ticket.find(query)
      .populate('assetId', 'assetCode assetType locationName locationDescription siteId mac serialNumber deviceType')
      .populate('createdBy', 'fullName username profilePicture')
      .populate('assignedTo', 'fullName username role profilePicture')
      .populate('slaPolicyId', 'policyName priority')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Ticket.countDocuments(query)
  ]);

  // Decrypt sensitive asset fields for authorized users
  const processedTickets = tickets.map(ticket => {
    const ticketObj = { ...ticket };
    if (ticketObj.assetId) {
      // Find if user is assigned to this site
      const siteIdStr = ticketObj.siteId?._id?.toString() || ticketObj.siteId?.toString();
      const isSiteAssigned = user.assignedSites && user.assignedSites.some(s => s.toString() === siteIdStr);

      // Decrypt if Admin/Supervisor OR assigned to site
      if (['Admin', 'Supervisor'].includes(user.role) || isSiteAssigned) {
        ticketObj.assetId = Asset.decryptSensitiveFields(ticket.assetId);
      } else {
        // Otherwise mask
        ticketObj.assetId = Asset.maskSensitiveFields(ticket.assetId);
      }
    }
    return ticketObj;
  });

  res.json({
    success: true,
    data: processedTickets,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

// @desc    Get single ticket
// @route   GET /api/tickets/:id
// @access  Private
export const getTicketById = asyncHandler(async (req, res, next) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate('siteId', 'siteName siteUniqueID city')
    .populate({
      path: 'assetId',
      select: 'assetCode assetType deviceType locationName locationDescription siteId serialNumber ipAddress mac make model',
      populate: {
        path: 'siteId',
        select: 'siteName siteUniqueID city'
      }
    })
    .populate('createdBy', 'fullName username email profilePicture')
    .populate('assignedTo', 'fullName username email role mobileNumber profilePicture')
    .populate('slaPolicyId')
    .populate('slaExtension.requestedBy', 'fullName')
    .populate('slaExtension.reviewedBy', 'fullName');

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found'
    });
  }

  // SiteClient: can only view tickets they created
  if (req.user.role === 'SiteClient' && ticket.createdBy._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Self-healing: If SLA data is missing, calculate it now
  if (!ticket.slaResponseDue || !ticket.slaRestoreDue) {
    try {
      const DEFAULT_SLA = { P1: { response: 15, restore: 60 }, P2: { response: 30, restore: 240 }, P3: { response: 60, restore: 480 }, P4: { response: 120, restore: 1440 } };
      const slaPolicy = await SLAPolicy.findOne({ priority: ticket.priority, isActive: true });
      const defaults = DEFAULT_SLA[ticket.priority] || DEFAULT_SLA['P3'];
      const responseMins = slaPolicy?.responseTimeMinutes ?? defaults.response;
      const restoreMins = slaPolicy?.restoreTimeMinutes ?? defaults.restore;
      const baseDate = ticket.createdAt || new Date();

      if (slaPolicy) ticket.slaPolicyId = slaPolicy._id;
      if (!ticket.slaResponseDue) ticket.slaResponseDue = new Date(baseDate.getTime() + responseMins * 60 * 1000);
      if (!ticket.slaRestoreDue) ticket.slaRestoreDue = new Date(baseDate.getTime() + restoreMins * 60 * 1000);

      await ticket.save();
      await ticket.populate('slaPolicyId');
    } catch (slaError) {
      console.error('Error auto-calculating SLA for ticket:', slaError);
    }
  }

  // Decrypt sensitive asset fields if authorized
  let ticketObj = ticket.toObject();
  if (ticketObj.assetId) {
    const user = req.user;
    // Check if user is assigned to the site
    // Note: siteId is populated, so use _id
    const siteIdStr = ticketObj.siteId?._id?.toString() || ticketObj.siteId?.toString();
    const isSiteAssigned = user.assignedSites && user.assignedSites.some(s => s.toString() === siteIdStr);

    // Check if user is assigned to the ticket and has started work
    const isTicketAssigned = ticketObj.assignedTo && ticketObj.assignedTo._id.toString() === user._id.toString();
    // Work started if status is NOT Open or Assigned. i.e. Acknowledged or later.
    const isWorkStarted = !['Open', 'Assigned'].includes(ticketObj.status);

    if (['Admin', 'Supervisor'].includes(user.role)) {
      ticketObj.assetId = Asset.decryptSensitiveFields(ticket.assetId);
    } else if (isSiteAssigned) {
      // User assigned to the site can view actual SL and MAC
      ticketObj.assetId = Asset.decryptSensitiveFields(ticket.assetId);
    } else if (isTicketAssigned && isWorkStarted) {
      // Assigned engineer can view only after acknowledging/starting
      ticketObj.assetId = Asset.decryptSensitiveFields(ticket.assetId);
    } else {
      // Otherwise show dots (masked)
      ticketObj.assetId = Asset.maskSensitiveFields(ticket.assetId);
    }
  }

  res.json({
    success: true,
    data: ticketObj
  });
});

// @desc    Create ticket
// @route   POST /api/tickets
// @access  Private
export const createTicket = asyncHandler(async (req, res, next) => {
  const ticketData = {
    ...req.body,
    createdBy: req.user._id
  };

  // SiteClient restrictions: force siteId from user, strip engineering fields, leave unassigned
  if (req.user.role === 'SiteClient') {
    ticketData.siteId = req.user.siteId || req.user.assignedSites?.[0] || req.body.siteId;
    ticketData.assignedTo = undefined;
    ticketData.assetId = undefined;
    ticketData.priority = ticketData.priority || 'P3'; // default
    ticketData.category = ticketData.category || 'General';
  }

  // Record assignment info and set initial status accordingly
  if (req.user.role !== 'SiteClient') {
    if (ticketData.assignedTo) {
      ticketData.assignedOn = new Date();
      ticketData.status = 'Assigned';
    } else if (req.user.role !== 'Admin') {
      // Non-admin, non-SiteClient with no assignee: assign to self
      ticketData.assignedTo = req.user._id;
      ticketData.assignedOn = new Date();
      ticketData.status = 'Assigned';
    } else {
      ticketData.status = 'Open';
    }
  } else {
    ticketData.status = 'Open';
  }

  const ticket = await Ticket.create(ticketData);

  // Create activity for ticket creation
  let activityContent = 'Ticket created';
  if (ticket.assignedTo) {
    // Find the assigned user to get their name for the activity
    const assignedUser = await mongoose.model('User').findById(ticket.assignedTo);
    if (assignedUser) {
      activityContent += ` and assigned to ${assignedUser.fullName}`;
    }
  }

  await TicketActivity.create({
    ticketId: ticket._id,
    userId: req.user._id,
    activityType: 'StatusChange',
    content: activityContent
  });

  const populatedTicket = await Ticket.findById(ticket._id)
    .populate('siteId', 'siteName siteUniqueID city')
    .populate('assetId', 'assetCode assetType deviceType locationName locationDescription siteId serialNumber ipAddress mac model make')
    .populate('createdBy', 'fullName username')
    .populate('assignedTo', 'fullName username role email')
    .populate('slaPolicyId', 'policyName');

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  if (io) {
    io.emit('ticket:created', populatedTicket);
    io.to(`ticket_${ticket._id}`).emit('activity:created', { ticketId: ticket._id.toString() });
  }

  // Send email notification to assigned user if assigned during creation
  if (populatedTicket.assignedTo?.email) {
    await sendTicketAssignmentEmail(populatedTicket, populatedTicket.assignedTo, req.user);
  }

  const finalTicket = populatedTicket.toObject();
  if (finalTicket.assetId) {
    const user = req.user;
    const siteIdStr = finalTicket.siteId?._id?.toString() || finalTicket.siteId?.toString();
    const isSiteAssigned = user.assignedSites && user.assignedSites.some(s => s.toString() === siteIdStr);

    const isTicketAssigned = finalTicket.assignedTo && finalTicket.assignedTo._id.toString() === user._id.toString();
    const isWorkStarted = !['Open', 'Assigned'].includes(finalTicket.status);

    if (['Admin', 'Supervisor'].includes(user.role)) {
      finalTicket.assetId = Asset.decryptSensitiveFields(populatedTicket.assetId);
    } else if (isSiteAssigned) {
      finalTicket.assetId = Asset.decryptSensitiveFields(populatedTicket.assetId);
    } else if (isTicketAssigned && isWorkStarted) {
      finalTicket.assetId = Asset.decryptSensitiveFields(populatedTicket.assetId);
    } else {
      finalTicket.assetId = Asset.maskSensitiveFields(populatedTicket.assetId);
    }
  }

  res.status(201).json({
    success: true,
    data: finalTicket,
    message: 'Ticket created successfully'
  });

  // Fire-and-forget: auto-track
  DailyWorkLog.logActivity(req.user._id, {
    category: 'TicketCreated',
    description: `Created ticket ${ticket.ticketNumber}`,
    refModel: 'Ticket',
    refId: ticket._id,
    metadata: { ticketNumber: ticket.ticketNumber }
  }).catch(() => { });
});

// @desc    Update ticket
// @route   PUT /api/tickets/:id
// @access  Private
export const updateTicket = asyncHandler(async (req, res, next) => {
  // SiteClient cannot edit tickets
  if (req.user.role === 'SiteClient') {
    return res.status(403).json({
      success: false,
      message: 'Clients are not permitted to edit ticket details'
    });
  }

  const originalTicket = await Ticket.findById(req.params.id);
  if (!originalTicket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found'
    });
  }

  const updates = req.body;
  const changedFields = [];

  // Fields to track for audit log
  const trackableFields = [
    { key: 'title', label: 'Title' },
    { key: 'description', label: 'Description' },
    { key: 'priority', label: 'Priority' },
    { key: 'category', label: 'Category' },
    { key: 'subCategory', label: 'Sub-Category' },
    { key: 'assetId', label: 'Asset' },
    { key: 'assignedTo', label: 'Assigned User' },
    { key: 'tags', label: 'Tags' }
  ];

  for (const field of trackableFields) {
    if (updates[field.key] !== undefined && updates[field.key]?.toString() !== originalTicket[field.key]?.toString()) {
      const oldVal = originalTicket[field.key] || 'None';
      const newVal = updates[field.key] || 'None';
      changedFields.push(`${field.label} changed`);
    }
  }

  // Apply updates
  Object.keys(updates).forEach(key => {
    originalTicket[key] = updates[key];
  });

  await originalTicket.save();

  // Re-fetch populated ticket
  const ticket = await Ticket.findById(originalTicket._id)
    .populate('assetId createdBy assignedTo slaPolicyId');

  // Log activity if fields were changed
  if (changedFields.length > 0) {
    await TicketActivity.create({
      ticketId: ticket._id,
      userId: req.user._id,
      activityType: 'StatusChange',
      content: `Ticket details updated: ${changedFields.join(', ')}`
    });

    // Emit socket event for real-time history update
    const io = req.app.get('io');
    if (io) {
      io.to(`ticket_${ticket._id}`).emit('activity:created', { ticketId: ticket._id.toString() });
    }
  }

  const finalTicket = ticket.toObject();
  if (finalTicket.assetId) {
    const user = req.user;
    // Check if user is assigned to site
    const siteIdStr = finalTicket.siteId?._id?.toString() || finalTicket.siteId?.toString();
    const isSiteAssigned = user.assignedSites && user.assignedSites.some(s => s.toString() === siteIdStr);

    const isTicketAssigned = finalTicket.assignedTo && finalTicket.assignedTo._id.toString() === user._id.toString();
    const isWorkStarted = !['Open', 'Assigned'].includes(finalTicket.status);

    if (['Admin', 'Supervisor'].includes(user.role)) {
      finalTicket.assetId = Asset.decryptSensitiveFields(ticket.assetId);
    } else if (isSiteAssigned) {
      finalTicket.assetId = Asset.decryptSensitiveFields(ticket.assetId);
    } else if (isTicketAssigned && isWorkStarted) {
      finalTicket.assetId = Asset.decryptSensitiveFields(ticket.assetId);
    } else {
      finalTicket.assetId = Asset.maskSensitiveFields(ticket.assetId);
    }
  }

  res.json({
    success: true,
    data: finalTicket,
    message: 'Ticket updated successfully'
  });

  // Fire-and-forget: auto-track
  if (changedFields.length > 0) {
    DailyWorkLog.logActivity(req.user._id, {
      category: 'TicketUpdated',
      description: `Updated ticket ${ticket.ticketNumber}: ${changedFields.join(', ')}`,
      refModel: 'Ticket',
      refId: ticket._id,
      metadata: { ticketNumber: ticket.ticketNumber, changes: changedFields }
    }).catch(() => { });
  }
});

// @desc    Assign ticket
// @route   POST /api/tickets/:id/assign
// @access  Private (Dispatcher, Admin)
export const assignTicket = asyncHandler(async (req, res, next) => {
  const { assignedTo, remarks } = req.body;

  let ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found'
    });
  }

  // Permission check: Admin, Supervisor, Dispatcher OR the current assignee
  const isManagement = ['Admin', 'Supervisor', 'Dispatcher'].includes(req.user.role);
  const isAssignee = ticket.assignedTo && ticket.assignedTo.toString() === req.user._id.toString();

  if (!isManagement && !isAssignee) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to reassign this ticket'
    });
  }

  // Auto-cancel a pending SLA extension request if the ticket is moving to a different assignee -
  // otherwise a stale request would be left pointing at whoever the new assignee is.
  const isReassignment = ticket.assignedTo && ticket.assignedTo.toString() !== String(assignedTo);
  const shouldCancelExtension = isReassignment && ticket.slaExtension?.status === 'Pending';
  if (shouldCancelExtension) {
    ticket.slaExtension.status = 'Cancelled';
    ticket.slaExtension.reviewedOn = new Date();
  }

  ticket.assignedTo = assignedTo;
  ticket.assignedOn = new Date();
  ticket.status = 'Assigned';

  await ticket.save();

  if (shouldCancelExtension) {
    await TicketActivity.create({
      ticketId: ticket._id,
      activityType: 'SLAExtension',
      isSystem: true,
      content: 'SLA extension request auto-cancelled: ticket reassigned'
    });
  }

  // Re-fetch with populations
  ticket = await Ticket.findById(ticket._id)
    .populate('assignedTo', 'fullName username email')
    .populate('siteId', 'siteName')
    .populate('assetId', 'assetCode');

  // Create activity with assignment details
  let activityContent = `Ticket assigned to ${ticket.assignedTo.fullName}`;
  if (remarks && remarks.trim()) {
    activityContent += `\nRemarks: ${remarks.trim()}`;
  }

  await TicketActivity.create({
    ticketId: ticket._id,
    userId: req.user._id,
    activityType: 'Assignment',
    content: activityContent
  });

  // Send email notification to assigned user
  if (ticket.assignedTo?.email) {
    await sendTicketAssignmentEmail(ticket, ticket.assignedTo, req.user);
  }

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${assignedTo}`).emit('ticket:assigned', ticket);
    io.to(`ticket_${ticket._id}`).emit('activity:created', { ticketId: ticket._id.toString() });
  }

  res.json({
    success: true,
    data: ticket,
    message: 'Ticket assigned successfully. Email notification has been sent.'
  });

  // Fire-and-forget: auto-track
  DailyWorkLog.logActivity(req.user._id, {
    category: 'TicketAssigned',
    description: `Assigned ticket ${ticket.ticketNumber} to ${ticket.assignedTo.fullName}`,
    refModel: 'Ticket',
    refId: ticket._id,
    metadata: { ticketNumber: ticket.ticketNumber, assignedTo: ticket.assignedTo.fullName }
  }).catch(() => { });
});

// @desc    Acknowledge ticket
// @route   POST /api/tickets/:id/acknowledge
// @access  Private (Engineer)
export const acknowledgeTicket = asyncHandler(async (req, res, next) => {
  const ticket = await Ticket.findByIdAndUpdate(
    req.params.id,
    {
      acknowledgedOn: new Date(),
      status: 'Acknowledged',
      updatedAt: new Date()
    },
    { new: true }
  );

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found'
    });
  }

  await TicketActivity.create({
    ticketId: ticket._id,
    userId: req.user._id,
    activityType: 'StatusChange',
    content: 'Ticket acknowledged'
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`ticket_${ticket._id}`).emit('activity:created', { ticketId: ticket._id.toString() });
  }

  res.json({
    success: true,
    data: ticket,
    message: 'Ticket acknowledged'
  });

  // Fire-and-forget: auto-track
  DailyWorkLog.logActivity(req.user._id, {
    category: 'TicketAcknowledged',
    description: `Acknowledged ticket ${ticket.ticketNumber}`,
    refModel: 'Ticket',
    refId: ticket._id,
    metadata: { ticketNumber: ticket.ticketNumber }
  }).catch(() => { });
});

// @desc    Start work on ticket
// @route   POST /api/tickets/:id/start
// @access  Private (Engineer)
export const startTicket = asyncHandler(async (req, res, next) => {
  const ticket = await Ticket.findByIdAndUpdate(
    req.params.id,
    {
      status: 'InProgress',
      startedOn: new Date(),
      updatedAt: new Date()
    },
    { new: true }
  );

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found'
    });
  }

  await TicketActivity.create({
    ticketId: ticket._id,
    userId: req.user._id,
    activityType: 'StatusChange',
    content: 'Work started on ticket'
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`ticket_${ticket._id}`).emit('activity:created', { ticketId: ticket._id.toString() });
  }

  res.json({
    success: true,
    data: ticket,
    message: 'Work started'
  });

  // Fire-and-forget: auto-track
  DailyWorkLog.logActivity(req.user._id, {
    category: 'TicketStarted',
    description: `Started work on ticket ${ticket.ticketNumber}`,
    refModel: 'Ticket',
    refId: ticket._id,
    metadata: { ticketNumber: ticket.ticketNumber }
  }).catch(() => { });
});

// @desc    Put a ticket on hold - pauses SLA until resumed
// @route   POST /api/tickets/:id/hold
// @access  Private (Admin, Supervisor)
export const holdTicket = asyncHandler(async (req, res, next) => {
  const { reason, estimatedResolutionTime } = req.body;
  if (!reason?.trim()) {
    return res.status(400).json({ success: false, message: 'A reason is required to place a ticket on hold' });
  }

  const parsedEta = estimatedResolutionTime ? new Date(estimatedResolutionTime) : null;
  if (estimatedResolutionTime && isNaN(parsedEta?.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid estimated resolution time' });
  }

  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Ticket not found' });
  }

  const FINAL_STATUSES = ['Resolved', 'Verified', 'Closed', 'Cancelled'];
  if (FINAL_STATUSES.includes(ticket.status)) {
    return res.status(400).json({ success: false, message: `Cannot put a ${ticket.status.toLowerCase()} ticket on hold` });
  }
  if (ticket.status === 'OnHold') {
    return res.status(400).json({ success: false, message: 'Ticket is already on hold' });
  }

  const now = new Date();
  ticket.holdDetails = {
    reason: reason.trim(),
    estimatedResolutionTime: parsedEta,
    heldBy: req.user._id,
    heldOn: now,
    previousStatus: ticket.status
  };
  ticket.status = 'OnHold';
  await ticket.save();

  await TicketActivity.create({
    ticketId: ticket._id,
    userId: req.user._id,
    activityType: 'StatusChange',
    content: `**Ticket Put On Hold** by ${req.user.fullName}\nReason: ${reason.trim()}${parsedEta ? `\nEstimated Resolution: ${parsedEta.toLocaleString()}` : ''}`
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`ticket_${ticket._id}`).emit('activity:created', { ticketId: ticket._id.toString() });
  }

  res.json({ success: true, data: ticket, message: 'Ticket placed on hold' });
});

// @desc    Resume a ticket from hold - shifts SLA due dates by the held duration
// @route   POST /api/tickets/:id/resume
// @access  Private (Admin, Supervisor)
export const resumeTicket = asyncHandler(async (req, res, next) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Ticket not found' });
  }

  if (ticket.status !== 'OnHold' || !ticket.holdDetails?.heldOn) {
    return res.status(400).json({ success: false, message: 'Ticket is not currently on hold' });
  }

  const isOwner = ticket.assignedTo && ticket.assignedTo.toString() === req.user._id.toString();
  const isPrivileged = ['Admin', 'Supervisor'].includes(req.user.role);
  if (!isOwner && !isPrivileged) {
    return res.status(403).json({ success: false, message: 'Not authorized to resume this ticket' });
  }

  const now = new Date();
  const heldMs = now.getTime() - new Date(ticket.holdDetails.heldOn).getTime();

  if (ticket.slaResponseDue) ticket.slaResponseDue = new Date(ticket.slaResponseDue.getTime() + heldMs);
  if (ticket.slaRestoreDue) ticket.slaRestoreDue = new Date(ticket.slaRestoreDue.getTime() + heldMs);
  ticket.totalHoldDurationMs = (ticket.totalHoldDurationMs || 0) + heldMs;

  ticket.status = ticket.holdDetails.previousStatus || 'InProgress';
  const holdReason = ticket.holdDetails.reason;
  ticket.holdDetails = undefined;
  await ticket.save();

  const heldMinutes = Math.round(heldMs / 60000);
  await TicketActivity.create({
    ticketId: ticket._id,
    userId: req.user._id,
    activityType: 'StatusChange',
    content: `**Ticket Resumed** by ${req.user.fullName} after being on hold for ${heldMinutes} minute(s) (Reason: ${holdReason}). SLA deadlines extended accordingly.`
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`ticket_${ticket._id}`).emit('activity:created', { ticketId: ticket._id.toString() });
  }

  res.json({ success: true, data: ticket, message: 'Ticket resumed' });
});

// @desc    Resolve ticket
// @route   POST /api/tickets/:id/resolve
// @access  Private (Engineer)
export const resolveTicket = asyncHandler(async (req, res, next) => {
  const { rootCause, resolutionSummary } = req.body;
  const now = new Date();

  // Fetch SLA deadline and assignment time to stamp breach state accurately.
  // A breach is only valid if the engineer was assigned BEFORE the SLA deadline -
  // retroactively-set SLA dates (deadline already past when engineer was assigned) are excluded.
  const existing = await Ticket.findById(req.params.id).select('slaRestoreDue assignedOn').lean();
  const slaDeadline = existing?.slaRestoreDue ? new Date(existing.slaRestoreDue) : null;
  const assignedOn = existing?.assignedOn ? new Date(existing.assignedOn) : null;
  const hadFairChance = slaDeadline && assignedOn && assignedOn <= slaDeadline;
  const isBreached = hadFairChance && now > slaDeadline;

  const ticket = await Ticket.findByIdAndUpdate(
    req.params.id,
    {
      status: 'Resolved',
      resolvedOn: now,
      rootCause,
      resolutionSummary,
      isSLARestoreBreached: isBreached,
      updatedAt: now
    },
    { new: true }
  );

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found'
    });
  }

  await TicketActivity.create({
    ticketId: ticket._id,
    userId: req.user._id,
    activityType: 'Resolution',
    content: `Ticket resolved. ${resolutionSummary || ''}`
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`ticket_${ticket._id}`).emit('activity:created', { ticketId: ticket._id.toString() });
  }

  res.json({
    success: true,
    data: ticket,
    message: 'Ticket resolved'
  });

  // Fire-and-forget: auto-track
  DailyWorkLog.logActivity(req.user._id, {
    category: 'TicketResolved',
    description: `Resolved ticket ${ticket.ticketNumber}`,
    refModel: 'Ticket',
    refId: ticket._id,
    metadata: { ticketNumber: ticket.ticketNumber }
  }).catch(() => { });
});

// @desc    Verify ticket
// @route   POST /api/tickets/:id/verify
// @access  Private (Dispatcher, Supervisor)
export const verifyTicket = asyncHandler(async (req, res, next) => {
  const ticket = await Ticket.findByIdAndUpdate(
    req.params.id,
    {
      status: 'Verified',
      verifiedBy: req.user.fullName,
      verifiedOn: new Date(),
      updatedAt: new Date()
    },
    { new: true }
  );

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found'
    });
  }

  await TicketActivity.create({
    ticketId: ticket._id,
    userId: req.user._id,
    activityType: 'StatusChange',
    content: 'Resolution verified'
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`ticket_${ticket._id}`).emit('activity:created', { ticketId: ticket._id.toString() });
  }

  res.json({
    success: true,
    data: ticket,
    message: 'Ticket verified'
  });

  // Fire-and-forget: auto-track
  DailyWorkLog.logActivity(req.user._id, {
    category: 'TicketVerified',
    description: `Verified resolution for ticket ${ticket.ticketNumber}`,
    refModel: 'Ticket',
    refId: ticket._id,
    metadata: { ticketNumber: ticket.ticketNumber }
  }).catch(() => { });
});

// @desc    Close ticket
// @route   POST /api/tickets/:id/close
// @access  Private (Dispatcher, Supervisor)
export const closeTicket = asyncHandler(async (req, res, next) => {
  const { notes } = req.body;
  const now = new Date();

  const existing = await Ticket.findById(req.params.id).select('slaRestoreDue resolvedOn assignedOn isSLARestoreBreached').lean();
  // Carry forward breach flag from resolve step, OR check for direct-close case.
  // Only flag a breach on direct close if the engineer was assigned before the SLA deadline
  // (retroactively-set SLA dates don't count as a breach).
  const slaDeadline = existing?.slaRestoreDue ? new Date(existing.slaRestoreDue) : null;
  const assignedOn = existing?.assignedOn ? new Date(existing.assignedOn) : null;
  const hadFairChance = slaDeadline && assignedOn && assignedOn <= slaDeadline;
  const isBreached = existing?.isSLARestoreBreached ||
    (hadFairChance && !existing?.resolvedOn && now > slaDeadline);

  const ticket = await Ticket.findByIdAndUpdate(
    req.params.id,
    {
      status: 'Closed',
      closedOn: now,
      isSLARestoreBreached: !!isBreached,
      updatedAt: now
    },
    { new: true }
  );

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found'
    });
  }

  await TicketActivity.create({
    ticketId: ticket._id,
    userId: req.user._id,
    activityType: 'StatusChange',
    content: `Ticket closed${notes ? '. Notes: ' + notes : ''}`
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`ticket_${ticket._id}`).emit('activity:created', { ticketId: ticket._id.toString() });
  }

  res.json({
    success: true,
    data: ticket,
    message: 'Ticket closed'
  });

  // Fire-and-forget: auto-track
  DailyWorkLog.logActivity(req.user._id, {
    category: 'TicketClosed',
    description: `Closed ticket ${ticket.ticketNumber}`,
    refModel: 'Ticket',
    refId: ticket._id,
    metadata: { ticketNumber: ticket.ticketNumber }
  }).catch(() => { });
});

// @desc    Reopen ticket
// @route   POST /api/tickets/:id/reopen
// @access  Private (Dispatcher, Supervisor)
export const reopenTicket = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;

  const ticket = await Ticket.findByIdAndUpdate(
    req.params.id,
    {
      status: 'Open',
      assignedTo: null,
      assignedOn: null,
      acknowledgedOn: null,
      startedOn: null,
      resolvedOn: null,
      closedOn: null,
      verifiedOn: null,
      verifiedBy: null,
      rootCause: null,
      resolutionSummary: null,
      escalationLevel: 0,
      escalatedBy: null,
      escalatedOn: null,
      escalationReason: null,
      escalationAcceptedBy: null,
      escalationAcceptedOn: null,
      updatedAt: new Date()
    },
    { new: true }
  );

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found'
    });
  }

  await TicketActivity.create({
    ticketId: ticket._id,
    userId: req.user._id,
    activityType: 'StatusChange',
    content: `Ticket reopened. Reason: ${reason || 'Not specified'}`
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`ticket_${ticket._id}`).emit('activity:created', { ticketId: ticket._id.toString() });
  }

  res.json({
    success: true,
    data: ticket,
    message: 'Ticket reopened'
  });

  // Fire-and-forget: auto-track
  DailyWorkLog.logActivity(req.user._id, {
    category: 'TicketReopened',
    description: `Reopened ticket ${ticket.ticketNumber}. Reason: ${reason || 'Not specified'}`,
    refModel: 'Ticket',
    refId: ticket._id,
    metadata: { ticketNumber: ticket.ticketNumber, reason }
  }).catch(() => { });
});

// @desc    Reject resolution (Admin/Supervisor discards resolution)
// @route   POST /api/tickets/:id/reject-resolution
// @access  Private (Admin, Dispatcher, Supervisor)
export const rejectResolution = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Rejection reason is required'
    });
  }

  const ticket = await Ticket.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found'
    });
  }

  if (ticket.status !== 'Resolved') {
    return res.status(400).json({
      success: false,
      message: 'Only resolved tickets can have their resolution rejected'
    });
  }

  ticket.status = 'ResolutionRejected';
  ticket.resolvedOn = null;
  ticket.rootCause = null;
  ticket.resolutionSummary = null;
  ticket.updatedAt = new Date();
  await ticket.save();

  await TicketActivity.create({
    ticketId: ticket._id,
    userId: req.user._id,
    activityType: 'StatusChange',
    content: `Resolution rejected by ${req.user.fullName}. Reason: ${reason.trim()}\n\nPlease reinvestigate and provide an update.`
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`ticket_${ticket._id}`).emit('activity:created', { ticketId: ticket._id.toString() });
    // Notify the assigned user
    if (ticket.assignedTo) {
      io.to(`user_${ticket.assignedTo}`).emit('ticket:resolution-rejected', {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        reason: reason.trim()
      });
    }
  }

  res.json({
    success: true,
    data: ticket,
    message: 'Resolution rejected. The assigned user has been notified to reinvestigate.'
  });
});

// @desc    Acknowledge rejection and resume work
// @route   POST /api/tickets/:id/acknowledge-rejection
// @access  Private (Assigned user)
export const acknowledgeRejection = asyncHandler(async (req, res, next) => {
  const ticket = await Ticket.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found'
    });
  }

  if (ticket.status !== 'ResolutionRejected') {
    return res.status(400).json({
      success: false,
      message: 'Ticket is not in rejection state'
    });
  }

  // Only the assigned user can acknowledge
  if (ticket.assignedTo?.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Only the assigned user can acknowledge the rejection'
    });
  }

  ticket.status = 'InProgress';
  ticket.updatedAt = new Date();
  await ticket.save();

  await TicketActivity.create({
    ticketId: ticket._id,
    userId: req.user._id,
    activityType: 'StatusChange',
    content: 'Rejection acknowledged. Work resumed on the ticket.'
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`ticket_${ticket._id}`).emit('activity:created', { ticketId: ticket._id.toString() });
  }

  res.json({
    success: true,
    data: ticket,
    message: 'Rejection acknowledged. Work resumed on the ticket.'
  });
});

// @desc    Escalate ticket
// @route   POST /api/tickets/:id/escalate
// @access  Private
export const escalateTicket = asyncHandler(async (req, res, next) => {
  const { reason, assignedTo } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Escalation reason is required'
    });
  }

  const ticket = await Ticket.findById(req.params.id)
    .populate('siteId', 'siteName')
    .populate('assetId', 'assetCode');

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found'
    });
  }

  // Permission check: Admin, Supervisor, Dispatcher OR the current assignee
  const isManagement = ['Admin', 'Supervisor', 'Dispatcher'].includes(req.user.role);
  const isAssignee = ticket.assignedTo && ticket.assignedTo.toString() === req.user._id.toString();

  if (!isManagement && !isAssignee) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to escalate this ticket'
    });
  }

  const protectedStatuses = ['Resolved', 'Verified', 'Closed', 'Cancelled'];
  if (protectedStatuses.includes(ticket.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot escalate a ${ticket.status.toLowerCase()} ticket`
    });
  }

  if (ticket.escalationLevel >= 3) {
    return res.status(400).json({
      success: false,
      message: 'Ticket has already reached maximum escalation level'
    });
  }

  const nextLevel = (ticket.escalationLevel || 0) + 1;

  // Auto-cancel a pending SLA extension request if the assignee is changing as part of this
  // escalation - otherwise a stale request would be left pointing at the wrong person.
  const previousAssignee = ticket.assignedTo ? ticket.assignedTo.toString() : null;
  const nextAssignee = assignedTo || null;
  const shouldCancelExtension = previousAssignee !== nextAssignee && ticket.slaExtension?.status === 'Pending';
  if (shouldCancelExtension) {
    ticket.slaExtension.status = 'Cancelled';
    ticket.slaExtension.reviewedOn = new Date();
  }

  ticket.status = 'Escalated';
  ticket.escalationLevel = nextLevel;
  ticket.escalatedBy = req.user._id;
  ticket.escalatedOn = new Date();
  ticket.escalationReason = reason.trim();

  // Manual designation of escalation user
  if (assignedTo) {
    ticket.assignedTo = assignedTo;
    ticket.assignedOn = new Date();
    // If manually assigned, we can mark it as accepted by the assigner on behalf of target
    // Or just leave it as Escalated with an assignee
  } else {
    ticket.assignedTo = undefined;
  }

  // Clear previous acceptance info when further escalating
  ticket.escalationAcceptedBy = undefined;
  ticket.escalationAcceptedOn = undefined;
  ticket.updatedAt = new Date();
  await ticket.save();

  await TicketActivity.create({
    ticketId: ticket._id,
    userId: req.user._id,
    activityType: 'Escalation',
    content: `Ticket escalated to Level ${nextLevel} by ${req.user.fullName}. Reason: ${reason.trim()}`
  });

  if (shouldCancelExtension) {
    await TicketActivity.create({
      ticketId: ticket._id,
      activityType: 'SLAExtension',
      isSystem: true,
      content: 'SLA extension request auto-cancelled: ticket reassigned'
    });
  }

  // Get escalation users for this level and send email notifications
  try {
    const UserRight = mongoose.model('UserRight');
    const escalationRight = `ESCALATION_L${nextLevel}`;

    const userRights = await UserRight.find({
      $or: [
        { globalRights: escalationRight },
        { 'siteRights.rights': escalationRight }
      ]
    }).select('user');

    const userIds = userRights.map(ur => ur.user);

    const escalationUsers = await User.find({
      _id: { $in: userIds },
      isActive: true
    }).select('fullName email');

    // Send email to each escalation user
    for (const escalationUser of escalationUsers) {
      if (escalationUser.email) {
        await sendTicketEscalationEmail(ticket, escalationUser, req.user, reason.trim());
      }
    }
  } catch (emailError) {
    console.error('Error sending escalation emails:', emailError);
    // Don't fail the escalation if email fails
  }

  const io = req.app.get('io');
  if (io) {
    io.to(`ticket_${ticket._id}`).emit('activity:created', { ticketId: ticket._id.toString() });
    io.emit('ticket:escalated', {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      escalatedBy: req.user.fullName,
      siteId: ticket.siteId,
      level: nextLevel
    });
  }

  res.json({
    success: true,
    data: ticket,
    message: `Ticket escalated to Level ${nextLevel} successfully. Email notifications have been sent.`
  });

  // Fire-and-forget: auto-track
  DailyWorkLog.logActivity(req.user._id, {
    category: 'TicketEscalated',
    description: `Escalated ticket ${ticket.ticketNumber} to Level ${nextLevel}`,
    refModel: 'Ticket',
    refId: ticket._id,
    metadata: { ticketNumber: ticket.ticketNumber, level: nextLevel }
  }).catch(() => { });
});

// @desc    Request an SLA extension (assignee or management) on a breached ticket
// @route   POST /api/tickets/:id/request-sla-extension
// @access  Private
export const requestSlaExtension = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({
      success: false,
      message: 'A reason for the delay is required'
    });
  }

  const ticket = await Ticket.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found'
    });
  }

  // Permission check: Admin, Supervisor, Dispatcher OR the current assignee
  const isManagement = ['Admin', 'Supervisor', 'Dispatcher'].includes(req.user.role);
  const isAssignee = ticket.assignedTo && ticket.assignedTo.toString() === req.user._id.toString();

  if (!isManagement && !isAssignee) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to request an SLA extension for this ticket'
    });
  }

  const protectedStatuses = ['Resolved', 'Verified', 'Closed', 'Cancelled'];
  if (protectedStatuses.includes(ticket.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot request an SLA extension on a ${ticket.status.toLowerCase()} ticket`
    });
  }

  if (!ticket.isSLARestoreBreached) {
    return res.status(400).json({
      success: false,
      message: 'SLA extension can only be requested once the ticket has breached its SLA'
    });
  }

  if (ticket.slaExtension?.status === 'Pending') {
    return res.status(400).json({
      success: false,
      message: 'An SLA extension request is already pending for this ticket'
    });
  }

  ticket.slaExtension = {
    status: 'Pending',
    reason: reason.trim(),
    requestedBy: req.user._id,
    requestedOn: new Date(),
    reviewedBy: undefined,
    reviewedOn: undefined,
    rejectionReason: undefined,
    previousSlaRestoreDue: undefined
  };
  await ticket.save();

  await TicketActivity.create({
    ticketId: ticket._id,
    userId: req.user._id,
    activityType: 'SLAExtension',
    content: `SLA Extension Requested by ${req.user.fullName}. Reason: ${reason.trim()}`
  });

  // Notify Admins and Supervisors
  try {
    const reviewers = await User.find({ role: { $in: ['Admin', 'Supervisor'] }, isActive: true }).select('fullName email _id');

    const notification = {
      title: '⏰ SLA Extension Requested',
      message: `${req.user.fullName} requested an SLA extension on ticket ${ticket.ticketNumber}. Reason: ${reason.trim()}`,
      type: 'warning',
      link: `/tickets/${ticket._id}`
    };

    if (reviewers.length) {
      await sendGeneralNotificationEmail(reviewers, notification);
    }

    const io = req.app.get('io');
    if (io) {
      for (const reviewer of reviewers) {
        await createSystemNotification(io, { userId: reviewer._id, ...notification }).catch(() => { });
      }
    }
  } catch (notifyError) {
    console.error('Error notifying reviewers of SLA extension request:', notifyError);
    // Don't fail the request if notification fails
  }

  const io = req.app.get('io');
  if (io) {
    io.to(`ticket_${ticket._id}`).emit('activity:created', { ticketId: ticket._id.toString() });
  }

  res.json({
    success: true,
    data: ticket,
    message: 'SLA extension request submitted. Admins and Supervisors have been notified.'
  });

  // Fire-and-forget: auto-track
  DailyWorkLog.logActivity(req.user._id, {
    category: 'Other',
    description: `Requested SLA extension on ticket ${ticket.ticketNumber}`,
    refModel: 'Ticket',
    refId: ticket._id,
    metadata: { ticketNumber: ticket.ticketNumber }
  }).catch(() => { });
});

// @desc    Approve a pending SLA extension request and set a new SLA deadline
// @route   POST /api/tickets/:id/sla-extension/approve
// @access  Private (Admin, Supervisor)
export const approveSlaExtension = asyncHandler(async (req, res, next) => {
  const { newSlaRestoreDue } = req.body;

  const parsedDate = newSlaRestoreDue ? new Date(newSlaRestoreDue) : null;
  if (!parsedDate || isNaN(parsedDate.getTime()) || parsedDate <= new Date()) {
    return res.status(400).json({
      success: false,
      message: 'A valid future SLA deadline is required'
    });
  }

  const ticket = await Ticket.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found'
    });
  }

  const protectedStatuses = ['Resolved', 'Verified', 'Closed', 'Cancelled'];
  if (protectedStatuses.includes(ticket.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot action an SLA extension on a ${ticket.status.toLowerCase()} ticket`
    });
  }

  if (ticket.slaExtension?.status !== 'Pending') {
    return res.status(400).json({
      success: false,
      message: 'No pending SLA extension request for this ticket'
    });
  }

  const previousSlaRestoreDue = ticket.slaRestoreDue;
  const requestedBy = ticket.slaExtension.requestedBy;

  ticket.slaRestoreDue = parsedDate;
  // Manual slaRestoreDue edits aren't caught by the pre-save hook (it only resets these on
  // priority change), so clear the breach/warning/reminder state by hand.
  ticket.isSLARestoreBreached = false;
  ticket.isSLAResponseBreached = false;
  ticket.isSlaBreachedNotificationSent = false;
  ticket.isBreachWarningSent = false;
  ticket.slaWarning1hSent = false;
  ticket.lastSlaReminderSentAt = undefined;

  ticket.slaExtension = {
    ...ticket.slaExtension.toObject(),
    status: 'Approved',
    reviewedBy: req.user._id,
    reviewedOn: new Date(),
    previousSlaRestoreDue
  };
  await ticket.save();

  await TicketActivity.create({
    ticketId: ticket._id,
    userId: req.user._id,
    activityType: 'SLAExtension',
    content: `SLA Extension Approved by ${req.user.fullName}. New deadline: ${parsedDate.toLocaleString()}`
  });

  // Notify the original requester
  try {
    if (requestedBy) {
      const requester = await User.findById(requestedBy).select('fullName email _id');
      if (requester) {
        const notification = {
          title: '✅ SLA Extension Approved',
          message: `Your SLA extension request for ticket ${ticket.ticketNumber} was approved by ${req.user.fullName}. New deadline: ${parsedDate.toLocaleString()}`,
          type: 'success',
          link: `/tickets/${ticket._id}`
        };
        await sendGeneralNotificationEmail(requester, notification);
        const io = req.app.get('io');
        if (io) {
          await createSystemNotification(io, { userId: requester._id, ...notification }).catch(() => { });
        }
      }
    }
  } catch (notifyError) {
    console.error('Error notifying requester of SLA extension approval:', notifyError);
  }

  const io = req.app.get('io');
  if (io) {
    io.to(`ticket_${ticket._id}`).emit('activity:created', { ticketId: ticket._id.toString() });
  }

  res.json({
    success: true,
    data: ticket,
    message: 'SLA extension approved'
  });
});

// @desc    Reject a pending SLA extension request
// @route   POST /api/tickets/:id/sla-extension/reject
// @access  Private (Admin, Supervisor)
export const rejectSlaExtension = asyncHandler(async (req, res, next) => {
  const { rejectionReason } = req.body;

  if (!rejectionReason || !rejectionReason.trim()) {
    return res.status(400).json({
      success: false,
      message: 'A reason for rejecting the extension request is required'
    });
  }

  const ticket = await Ticket.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found'
    });
  }

  const protectedStatuses = ['Resolved', 'Verified', 'Closed', 'Cancelled'];
  if (protectedStatuses.includes(ticket.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot action an SLA extension on a ${ticket.status.toLowerCase()} ticket`
    });
  }

  if (ticket.slaExtension?.status !== 'Pending') {
    return res.status(400).json({
      success: false,
      message: 'No pending SLA extension request for this ticket'
    });
  }

  const requestedBy = ticket.slaExtension.requestedBy;

  ticket.slaExtension.status = 'Rejected';
  ticket.slaExtension.reviewedBy = req.user._id;
  ticket.slaExtension.reviewedOn = new Date();
  ticket.slaExtension.rejectionReason = rejectionReason.trim();
  await ticket.save();

  await TicketActivity.create({
    ticketId: ticket._id,
    userId: req.user._id,
    activityType: 'SLAExtension',
    content: `SLA Extension Rejected by ${req.user.fullName}. Reason: ${rejectionReason.trim()}`
  });

  // Notify the original requester
  try {
    if (requestedBy) {
      const requester = await User.findById(requestedBy).select('fullName email _id');
      if (requester) {
        const notification = {
          title: '❌ SLA Extension Rejected',
          message: `Your SLA extension request for ticket ${ticket.ticketNumber} was rejected by ${req.user.fullName}. Reason: ${rejectionReason.trim()}`,
          type: 'error',
          link: `/tickets/${ticket._id}`
        };
        await sendGeneralNotificationEmail(requester, notification);
        const io = req.app.get('io');
        if (io) {
          await createSystemNotification(io, { userId: requester._id, ...notification }).catch(() => { });
        }
      }
    }
  } catch (notifyError) {
    console.error('Error notifying requester of SLA extension rejection:', notifyError);
  }

  const io = req.app.get('io');
  if (io) {
    io.to(`ticket_${ticket._id}`).emit('activity:created', { ticketId: ticket._id.toString() });
  }

  res.json({
    success: true,
    data: ticket,
    message: 'SLA extension rejected'
  });
});

// @desc    Accept escalation
// @route   POST /api/tickets/:id/accept-escalation
// @access  Private (Escalation Team)
export const acceptEscalation = asyncHandler(async (req, res, next) => {
  const { assignedTo } = req.body;
  const ticket = await Ticket.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found'
    });
  }

  if (ticket.status !== 'Escalated') {
    return res.status(400).json({
      success: false,
      message: 'Ticket is not in escalated state'
    });
  }

  const targetUserId = assignedTo || req.user._id;
  const assignedUser = await User.findById(targetUserId);

  if (!assignedUser) {
    return res.status(404).json({
      success: false,
      message: 'Assigned user not found'
    });
  }

  ticket.status = 'InProgress';
  ticket.assignedTo = targetUserId;
  ticket.assignedOn = new Date();
  ticket.escalationAcceptedBy = req.user._id;
  ticket.escalationAcceptedOn = new Date();
  ticket.updatedAt = new Date();
  await ticket.save();

  const content = assignedTo && assignedTo.toString() !== req.user._id.toString()
    ? `Escalation accepted by ${req.user.fullName} and assigned to ${assignedUser.fullName}.`
    : `Escalation accepted by ${req.user.fullName}. Ticket is now in progress.`;

  await TicketActivity.create({
    ticketId: ticket._id,
    userId: req.user._id,
    activityType: 'StatusChange',
    content: content
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`ticket_${ticket._id}`).emit('activity:created', { ticketId: ticket._id.toString() });
    io.emit('ticket:updated', {
      ticketId: ticket._id,
      status: 'InProgress',
      assignedTo: assignedUser.fullName
    });
  }

  res.json({
    success: true,
    data: ticket,
    message: assignedTo && assignedTo.toString() !== req.user._id.toString()
      ? `Escalation accepted and assigned to ${assignedUser.fullName}.`
      : 'Escalation accepted. You are now assigned to this ticket.'
  });
});

// @desc    Get ticket audit trail
// @route   GET /api/tickets/:id/audit
// @access  Private
export const getAuditTrail = asyncHandler(async (req, res, next) => {
  const activities = await TicketActivity.find({ ticketId: req.params.id })
    .populate('userId', 'fullName username')
    .sort({ createdOn: -1 });

  res.json({
    success: true,
    data: activities
  });
});

// @desc    Get dashboard stats - OPTIMIZED VERSION
// @route   GET /api/tickets/dashboard/stats
// @access  Private
export const getDashboardStats = asyncHandler(async (req, res, next) => {
  const user = req.user;
  const { siteId } = req.query;
  let matchQuery = {};

  // Site filtering from query params
  if (siteId) {
    // Validate access for non-admins
    if (user.role !== 'Admin') {
      const hasAccess = user.assignedSites?.some(s => s.toString() === siteId);
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'Access denied to this site' });
      }
    }
    matchQuery.siteId = new mongoose.Types.ObjectId(siteId);
  } else if (user.role === 'SiteClient') {
    // SiteClient: only sees stats for tickets they created
    matchQuery.createdBy = user._id;
  } else if (user.role !== 'Admin') {
    // Existing role-based filtering: tickets from assigned sites OR created/assigned to me
    const assignedSiteIds = (user.assignedSites || []).map(s => new mongoose.Types.ObjectId(s));

    matchQuery.$or = [
      { assignedTo: user._id },
      { createdBy: user._id },
      { siteId: { $in: assignedSiteIds } }
    ];
  }

  // Role-based filtering for assets
  let assetMatchQuery = {};
  if (siteId) {
    assetMatchQuery.siteId = new mongoose.Types.ObjectId(siteId);
  } else if (user.role !== 'Admin') {
    assetMatchQuery.siteId = { $in: (user.assignedSites || []).map(s => new mongoose.Types.ObjectId(s)) };
  }

  // Single aggregation with $facet for all stats - much faster than multiple queries
  const [stats] = await Ticket.aggregate([
    { $match: matchQuery },
    {
      $facet: {
        // All status counts in one pass
        statusCounts: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        // Priority breakdown (non-closed/cancelled)
        priorityBreakdown: [
          { $match: { status: { $nin: ['Closed', 'Cancelled'] } } },
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ],
        // Category breakdown (non-closed/cancelled)
        categoryBreakdown: [
          { $match: { status: { $nin: ['Closed', 'Cancelled'] } } },
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ],
        // SLA breached count (active tickets only)
        slaBreached: [
          { $match: { isSLARestoreBreached: true, status: { $nin: ['Closed', 'Cancelled'] } } },
          { $count: 'count' }
        ],
        // Critical priority OR SLA-breached active tickets
        criticalOrBreached: [
          {
            $match: {
              status: { $nin: ['Closed', 'Cancelled'] },
              $or: [
                { priority: 'Critical' },
                { isSLARestoreBreached: true }
              ]
            }
          },
          { $count: 'count' }
        ],
        // SLA at risk count
        slaAtRisk: [
          {
            $match: {
              slaRestoreDue: { $lte: new Date(Date.now() + 4 * 60 * 60 * 1000), $gt: new Date() },
              isSLARestoreBreached: { $ne: true },
              status: { $nin: ['Closed', 'Cancelled', 'Resolved'] }
            }
          },
          { $count: 'count' }
        ],
        // Resolved today
        resolvedToday: [
          { $match: { resolvedOn: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } } },
          { $count: 'count' }
        ],
        // SLA compliance: resolved/closed within deadline (use actual timestamps, not stored flag)
        // Only count tickets that had an SLA assigned (slaRestoreDue exists)
        closedCompliant: [
          {
            $match: {
              status: { $in: ['Closed', 'Resolved'] },
              slaRestoreDue: { $exists: true, $ne: null },
              $expr: {
                $lte: [
                  { $ifNull: ['$resolvedOn', '$closedOn'] },
                  '$slaRestoreDue'
                ]
              }
            }
          },
          { $count: 'count' }
        ],
        // Denominator: only tickets with SLA data (exclude tickets with no slaRestoreDue)
        totalClosedWithSLA: [
          {
            $match: {
              status: { $in: ['Closed', 'Resolved'] },
              slaRestoreDue: { $exists: true, $ne: null }
            }
          },
          { $count: 'count' }
        ],
        totalClosed: [
          { $match: { status: { $in: ['Closed', 'Resolved'] } } },
          { $count: 'count' }
        ],
        // Total tickets
        totalCount: [
          { $count: 'count' }
        ]
      }
    }
  ]);

  // Get asset counts in parallel (only 2 queries)
  const [totalAssets, offlineAssets] = await Promise.all([
    Asset.countDocuments({ ...assetMatchQuery, status: { $ne: 'Spare' } }),
    Asset.countDocuments({ ...assetMatchQuery, status: 'Offline' })
  ]);

  // Process status counts into an object
  const statusCounts = {};
  (stats.statusCounts || []).forEach(item => {
    statusCounts[item._id] = item.count;
  });

  // Extract values with defaults
  const totalOpen = statusCounts['Open'] || 0;
  const totalAssigned = statusCounts['Assigned'] || 0;
  const totalAcknowledged = statusCounts['Acknowledged'] || 0;
  const totalInProgress = statusCounts['InProgress'] || 0;
  const totalResolved = statusCounts['Resolved'] || 0;
  const totalClosed = statusCounts['Closed'] || 0;
  const totalEscalated = statusCounts['Escalated'] || 0;
  const totalTickets = stats.totalCount[0]?.count || 0;
  const slaBreached = stats.slaBreached[0]?.count || 0;
  const slaAtRisk = stats.slaAtRisk[0]?.count || 0;
  const resolvedToday = stats.resolvedToday[0]?.count || 0;

  // SLA compliance: % of tickets-with-SLA that were resolved before their deadline
  // Denominator excludes tickets with no slaRestoreDue (no SLA data = meaningless)
  const closedWithSLA = stats.closedCompliant[0]?.count || 0;
  const totalClosedWithSLA = stats.totalClosedWithSLA[0]?.count || 0;
  const criticalTickets = stats.criticalOrBreached[0]?.count || 0;
  const slaCompliancePercent = totalClosedWithSLA > 0
    ? Math.round((closedWithSLA / totalClosedWithSLA) * 100)
    : null;

  // Format chart data
  const ticketsByPriority = (stats.priorityBreakdown || []).map(item => ({
    priority: item._id,
    count: item.count
  }));

  const ticketsByStatus = (stats.statusCounts || []).map(item => ({
    status: item._id,
    count: item.count
  }));

  const ticketsByCategory = (stats.categoryBreakdown || []).map(item => ({
    category: item._id || 'Uncategorized',
    count: item.count
  }));

  res.json({
    success: true,
    data: {
      // Main stats
      // Open = tickets not yet acknowledged (Open + Assigned statuses)
      openTickets: (statusCounts['Open'] || 0) + (statusCounts['Assigned'] || 0),
      inProgressTickets: totalInProgress,
      escalatedTickets: totalEscalated,
      criticalTickets,
      slaBreached,
      slaAtRisk,
      slaCompliancePercent,
      totalTickets,
      resolvedToday,

      // Asset stats
      totalAssets,
      offlineAssets,

      // Debug info (remove after verification)
      _debug: {
        assetQuery: JSON.stringify(assetMatchQuery),
        deployVersion: '2026-01-27-v2',
        userRole: user.role,
        hasIsActiveFilter: false
      },

      // Available engineers
      availableEngineers: 0,

      // Charts data
      ticketsByPriority,
      ticketsByStatus,
      ticketsByCategory,

      // Legacy fields
      totalOpen,
      totalAssigned,
      totalInProgress,
      totalResolved,
      totalClosed,
      totalEscalated,
      totalActive: totalOpen + totalAssigned + totalAcknowledged + totalInProgress
    }
  });
});
