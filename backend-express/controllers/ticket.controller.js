import mongoose from 'mongoose';
import Ticket from '../models/Ticket.model.js';
import User from '../models/User.model.js';
import Asset from '../models/Asset.model.js';
import TicketActivity from '../models/TicketActivity.model.js';
import SLAPolicy from '../models/SLAPolicy.model.js';
import { sendTicketAssignmentEmail, sendTicketEscalationEmail } from '../utils/email.utils.js';

// @desc    Get all tickets
// @route   GET /api/tickets
// @access  Private
export const getTickets = async (req, res, next) => {
  try {
    const {
      status, priority, category, siteId, assetId, assignedTo, createdBy,
      search, page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc',
      isSLABreached, isEscalated, slaStatus
    } = req.query;

    const query = {};

    // Role-based filtering
    const user = req.user;

    // Admin sees all. Others see based on site/assignment logic.
    if (user.role !== 'Admin') {
      // Normal users see:
      // 1. Tickets assigned to them
      // 2. Tickets created by them
      // 3. Tickets for their assigned sites
      // 4. Escalated tickets for sites where they have escalation rights (already covered by siteId filter usually, but let's be explicit)
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
        query.slaRestoreDue = { $lte: new Date(Date.now() + 30 * 60 * 1000) }; // Within 30 minutes
        query.isSLARestoreBreached = false;
        query.status = { $nin: ['Closed', 'Cancelled', 'Resolved'] };
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
      const searchRegex = { $regex: search, $options: 'i' };
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
        .populate('assetId', 'assetCode assetType locationDescription siteId')
        .populate('createdBy', 'fullName username profilePicture')
        .populate('assignedTo', 'fullName username role profilePicture')
        .populate('slaPolicyId', 'policyName priority')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Ticket.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: tickets,
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

// @desc    Get single ticket
// @route   GET /api/tickets/:id
// @access  Private
export const getTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('siteId', 'siteName siteUniqueID city')
      .populate({
        path: 'assetId',
        select: 'assetCode assetType deviceType locationDescription siteId serialNumber ipAddress mac make model',
        populate: {
          path: 'siteId',
          select: 'siteName siteUniqueID city'
        }
      })
      .populate('createdBy', 'fullName username email profilePicture')
      .populate('assignedTo', 'fullName username email role mobileNumber profilePicture')
      .populate('slaPolicyId');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Self-healing: If SLA data is missing, calculate it now
    if (!ticket.slaPolicyId || !ticket.slaResponseDue || !ticket.slaRestoreDue) {
      try {
        const slaPolicy = await SLAPolicy.findOne({
          priority: ticket.priority,
          isActive: true
        });

        if (slaPolicy) {
          ticket.slaPolicyId = slaPolicy._id;
          const baseDate = ticket.createdAt || new Date();

          if (!ticket.slaResponseDue) {
            ticket.slaResponseDue = new Date(baseDate.getTime() + slaPolicy.responseTimeMinutes * 60 * 1000);
          }
          if (!ticket.slaRestoreDue) {
            ticket.slaRestoreDue = new Date(baseDate.getTime() + slaPolicy.restoreTimeMinutes * 60 * 1000);
          }

          await ticket.save();
          // Reload to ensure population
          await ticket.populate('slaPolicyId');
        }
      } catch (slaError) {
        console.error('Error auto-calculating SLA for ticket:', slaError);
      }
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create ticket
// @route   POST /api/tickets
// @access  Private
export const createTicket = async (req, res, next) => {
  try {
    const ticketData = {
      ...req.body,
      createdBy: req.user._id
    };

    // If assignedTo is provided during creation, set status to Assigned
    if (ticketData.assignedTo) {
      ticketData.status = 'Assigned';
      ticketData.assignedOn = new Date();
    }

    // Note: SLA Policy and due dates are automatically assigned in the Ticket Model pre-save hook
    // based on the impact, urgency and priority.

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
      .populate('assetId', 'assetCode assetType deviceType locationDescription siteId serialNumber ipAddress mac model make')
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

    res.status(201).json({
      success: true,
      data: populatedTicket,
      message: 'Ticket created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update ticket
// @route   PUT /api/tickets/:id
// @access  Private
export const updateTicket = async (req, res, next) => {
  try {
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

    res.json({
      success: true,
      data: ticket,
      message: 'Ticket updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign ticket
// @route   POST /api/tickets/:id/assign
// @access  Private (Dispatcher, Admin)
export const assignTicket = async (req, res, next) => {
  try {
    const { assignedTo, remarks } = req.body;

    let ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    ticket.assignedTo = assignedTo;
    ticket.assignedOn = new Date();
    ticket.status = 'Assigned';

    await ticket.save();

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
  } catch (error) {
    next(error);
  }
};

// @desc    Acknowledge ticket
// @route   POST /api/tickets/:id/acknowledge
// @access  Private (Engineer)
export const acknowledgeTicket = async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
};

// @desc    Start work on ticket
// @route   POST /api/tickets/:id/start
// @access  Private (Engineer)
export const startTicket = async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve ticket
// @route   POST /api/tickets/:id/resolve
// @access  Private (Engineer)
export const resolveTicket = async (req, res, next) => {
  try {
    const { rootCause, resolutionSummary } = req.body;

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Resolved',
        resolvedOn: new Date(),
        rootCause,
        resolutionSummary,
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
  } catch (error) {
    next(error);
  }
};

// @desc    Verify ticket
// @route   POST /api/tickets/:id/verify
// @access  Private (Dispatcher, Supervisor)
export const verifyTicket = async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
};

// @desc    Close ticket
// @route   POST /api/tickets/:id/close
// @access  Private (Dispatcher, Supervisor)
export const closeTicket = async (req, res, next) => {
  try {
    const { notes } = req.body;

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Closed',
        closedOn: new Date(),
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
  } catch (error) {
    next(error);
  }
};

// @desc    Reopen ticket
// @route   POST /api/tickets/:id/reopen
// @access  Private (Dispatcher, Supervisor)
export const reopenTicket = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Open',
        resolvedOn: null,
        closedOn: null,
        verifiedOn: null,
        verifiedBy: null,
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
  } catch (error) {
    next(error);
  }
};

// @desc    Reject resolution (Admin/Supervisor discards resolution)
// @route   POST /api/tickets/:id/reject-resolution
// @access  Private (Admin, Dispatcher, Supervisor)
export const rejectResolution = async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
};

// @desc    Acknowledge rejection and resume work
// @route   POST /api/tickets/:id/acknowledge-rejection
// @access  Private (Assigned user)
export const acknowledgeRejection = async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
};

// @desc    Escalate ticket
// @route   POST /api/tickets/:id/escalate
// @access  Private
export const escalateTicket = async (req, res, next) => {
  try {
    const { reason } = req.body;

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

    ticket.status = 'Escalated';
    ticket.escalationLevel = nextLevel;
    ticket.escalatedBy = req.user._id;
    ticket.escalatedOn = new Date();
    ticket.escalationReason = reason.trim();
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
  } catch (error) {
    next(error);
  }
};

// @desc    Accept escalation
// @route   POST /api/tickets/:id/accept-escalation
// @access  Private (Escalation Team)
export const acceptEscalation = async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
};

// @desc    Get ticket audit trail
// @route   GET /api/tickets/:id/audit
// @access  Private
export const getAuditTrail = async (req, res, next) => {
  try {
    const activities = await TicketActivity.find({ ticketId: req.params.id })
      .populate('userId', 'fullName username')
      .sort({ createdOn: -1 });

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard stats - OPTIMIZED VERSION
// @route   GET /api/tickets/dashboard/stats
// @access  Private
export const getDashboardStats = async (req, res, next) => {
  try {
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
          // SLA breached count
          slaBreached: [
            { $match: { isSLARestoreBreached: true, status: { $nin: ['Closed', 'Cancelled'] } } },
            { $count: 'count' }
          ],
          // SLA at risk count
          slaAtRisk: [
            {
              $match: {
                slaRestoreDue: { $lte: new Date(Date.now() + 30 * 60 * 1000) },
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
          // SLA compliance counts
          closedCompliant: [
            { $match: { status: 'Closed', isSLARestoreBreached: false } },
            { $count: 'count' }
          ],
          totalClosed: [
            { $match: { status: 'Closed' } },
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

    // SLA compliance
    const closedWithSLA = stats.closedCompliant[0]?.count || 0;
    const totalClosedForSLA = stats.totalClosed[0]?.count || 0;
    const slaCompliancePercent = totalClosedForSLA > 0
      ? Math.round((closedWithSLA / totalClosedForSLA) * 100)
      : 100;

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
        openTickets: totalOpen,
        inProgressTickets: totalInProgress,
        escalatedTickets: totalEscalated,
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
  } catch (error) {
    next(error);
  }
};
