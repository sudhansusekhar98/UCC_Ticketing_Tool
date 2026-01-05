import mongoose from 'mongoose';
import Ticket from '../models/Ticket.model.js';
import TicketActivity from '../models/TicketActivity.model.js';
import SLAPolicy from '../models/SLAPolicy.model.js';

// @desc    Get all tickets
// @route   GET /api/tickets
// @access  Private
export const getTickets = async (req, res, next) => {
  try {
    const { 
      status, priority, category, assetId, assignedTo, createdBy,
      search, page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;
    
    const query = {};
    
    // Role-based filtering
    const user = req.user;
    if (user.role === 'L1Engineer' || user.role === 'L2Engineer') {
      query.assignedTo = user._id;
    } else if (user.role === 'ClientViewer') {
      // Client can only see tickets for their site
      if (user.siteId) {
        query['asset.siteId'] = user.siteId;
      }
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
    if (assetId) query.assetId = assetId;
    if (assignedTo) query.assignedTo = assignedTo;
    if (createdBy) query.createdBy = createdBy;
    if (search) {
      query.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .populate('assetId', 'assetCode assetType locationDescription siteId')
        .populate('createdBy', 'fullName username')
        .populate('assignedTo', 'fullName username role')
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
      .populate('assetId', 'assetCode assetType locationDescription siteId make model')
      .populate('createdBy', 'fullName username email')
      .populate('assignedTo', 'fullName username email role mobileNumber')
      .populate('slaPolicyId');
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
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
    
    // Auto-assign SLA policy based on priority
    if (!ticketData.slaPolicyId && ticketData.priority) {
      const slaPolicy = await SLAPolicy.findOne({ 
        priority: ticketData.priority, 
        isActive: true 
      });
      if (slaPolicy) {
        ticketData.slaPolicyId = slaPolicy._id;
        // Set SLA due times
        const now = new Date();
        ticketData.slaResponseDue = new Date(now.getTime() + slaPolicy.responseTimeMinutes * 60 * 1000);
        ticketData.slaRestoreDue = new Date(now.getTime() + slaPolicy.restoreTimeMinutes * 60 * 1000);
      }
    }
    
    const ticket = await Ticket.create(ticketData);
    
    // Create activity for ticket creation
    await TicketActivity.create({
      ticketId: ticket._id,
      userId: req.user._id,
      activityType: 'StatusChange',
      content: 'Ticket created'
    });
    
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('assetId', 'assetCode assetType')
      .populate('createdBy', 'fullName username')
      .populate('slaPolicyId', 'policyName');
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('ticket:created', populatedTicket);
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
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('assetId createdBy assignedTo slaPolicyId');
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
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
    const { assignedTo, notes } = req.body;
    
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo,
        assignedOn: new Date(),
        status: 'Assigned',
        updatedAt: new Date()
      },
      { new: true }
    ).populate('assignedTo', 'fullName username');
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    // Create activity
    await TicketActivity.create({
      ticketId: ticket._id,
      userId: req.user._id,
      activityType: 'Assignment',
      content: `Ticket assigned to ${ticket.assignedTo.fullName}${notes ? '. Notes: ' + notes : ''}`
    });
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${assignedTo}`).emit('ticket:assigned', ticket);
    }
    
    res.json({
      success: true,
      data: ticket,
      message: 'Ticket assigned successfully'
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
    const { reason } = req.query;
    
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
    
    res.json({
      success: true,
      data: ticket,
      message: 'Ticket reopened'
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

// @desc    Get dashboard stats
// @route   GET /api/tickets/dashboard/stats
// @access  Private
export const getDashboardStats = async (req, res, next) => {
  try {
    const user = req.user;
    let matchQuery = {};
    
    // Role-based filtering
    if (user.role === 'L1Engineer' || user.role === 'L2Engineer') {
      matchQuery.assignedTo = user._id;
    }
    
    const [
      totalOpen,
      totalAssigned,
      totalAcknowledged,
      totalInProgress,
      totalResolved,
      totalClosed,
      totalTickets,
      slaBreached,
      slaAtRisk,
      totalAssets,
      offlineAssets,
      byPriority,
      byStatus,
      byCategory,
      resolvedToday
    ] = await Promise.all([
      Ticket.countDocuments({ ...matchQuery, status: 'Open' }),
      Ticket.countDocuments({ ...matchQuery, status: 'Assigned' }),
      Ticket.countDocuments({ ...matchQuery, status: 'Acknowledged' }),
      Ticket.countDocuments({ ...matchQuery, status: 'InProgress' }),
      Ticket.countDocuments({ ...matchQuery, status: 'Resolved' }),
      Ticket.countDocuments({ ...matchQuery, status: 'Closed' }),
      Ticket.countDocuments(matchQuery),
      Ticket.countDocuments({ ...matchQuery, isSLARestoreBreached: true, status: { $nin: ['Closed', 'Cancelled'] } }),
      Ticket.countDocuments({ 
        ...matchQuery, 
        slaRestoreDue: { $lte: new Date(Date.now() + 30 * 60 * 1000) }, // Within 30 minutes
        status: { $nin: ['Closed', 'Cancelled', 'Resolved'] } 
      }),
      // Asset counts
      mongoose.connection.collection('assets').countDocuments({ isActive: true }),
      mongoose.connection.collection('assets').countDocuments({ isActive: true, status: 'Offline' }),
      // Priority breakdown
      Ticket.aggregate([
        { $match: { ...matchQuery, status: { $nin: ['Closed', 'Cancelled'] } } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      // Status breakdown
      Ticket.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // Category breakdown
      Ticket.aggregate([
        { $match: { ...matchQuery, status: { $nin: ['Closed', 'Cancelled'] } } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      // Resolved today
      Ticket.countDocuments({
        ...matchQuery,
        resolvedOn: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      })
    ]);
    
    // Calculate SLA compliance
    const closedWithSLA = await Ticket.countDocuments({ 
      ...matchQuery, 
      status: 'Closed',
      isSLARestoreBreached: false 
    });
    const totalClosedForSLA = await Ticket.countDocuments({ 
      ...matchQuery, 
      status: 'Closed' 
    });
    const slaCompliancePercent = totalClosedForSLA > 0 
      ? Math.round((closedWithSLA / totalClosedForSLA) * 100) 
      : 100;
    
    // Format tickets by priority for charts
    const ticketsByPriority = byPriority.map(item => ({
      priority: item._id,
      count: item.count
    }));
    
    // Format tickets by status for charts
    const ticketsByStatus = byStatus.map(item => ({
      status: item._id,
      count: item.count
    }));
    
    // Format tickets by category for charts
    const ticketsByCategory = byCategory.map(item => ({
      category: item._id || 'Uncategorized',
      count: item.count
    }));
    
    res.json({
      success: true,
      data: {
        // Main stats (matching frontend expectations)
        openTickets: totalOpen,
        inProgressTickets: totalAssigned + totalAcknowledged + totalInProgress,
        slaBreached,
        slaAtRisk,
        slaCompliancePercent,
        totalTickets,
        resolvedToday,
        
        // Asset stats
        totalAssets,
        offlineAssets,
        
        // Available engineers count
        availableEngineers: 0, // Can be implemented with user workload check
        
        // Charts data
        ticketsByPriority,
        ticketsByStatus,
        ticketsByCategory,
        
        // Legacy fields for compatibility
        totalOpen,
        totalAssigned,
        totalInProgress,
        totalResolved,
        totalClosed,
        totalActive: totalOpen + totalAssigned + totalAcknowledged + totalInProgress
      }
    });
  } catch (error) {
    next(error);
  }
};
