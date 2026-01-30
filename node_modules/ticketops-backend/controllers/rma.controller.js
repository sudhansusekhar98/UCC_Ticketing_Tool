import RMARequest from '../models/RMARequest.model.js';
import Ticket from '../models/Ticket.model.js';
import Asset from '../models/Asset.model.js';
import TicketActivity from '../models/TicketActivity.model.js';
import User from '../models/User.model.js';
import { sendRMACreationEmail } from '../utils/email.utils.js';

// @desc    Get all RMA records
// @route   GET /api/rma
// @access  Private
export const getAllRMAs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      siteId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by site
    if (siteId) {
      query.siteId = siteId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query with population
    let rmasQuery = RMARequest.find(query)
      .populate('ticketId', 'ticketNumber title status priority')
      .populate('siteId', 'siteName siteCode')
      .populate('originalAssetId', 'assetCode assetType ipAddress serialNumber locationDescription locationName')
      .populate('requestedBy', 'fullName')
      .populate('approvedBy', 'fullName')
      .populate('timeline.changedBy', 'fullName')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const [rmas, total] = await Promise.all([
      rmasQuery.exec(),
      RMARequest.countDocuments(query)
    ]);

    // Categorize RMAs
    const ongoingStatuses = ['Requested', 'Approved', 'Ordered', 'Dispatched', 'Received'];
    const completedStatuses = ['Installed', 'Rejected'];

    const ongoing = rmas.filter(r => ongoingStatuses.includes(r.status));
    const completed = rmas.filter(r => completedStatuses.includes(r.status));

    res.json({
      success: true,
      data: rmas,
      ongoing,
      completed,
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

// @desc    Create a new RMA request
// @route   POST /api/rma
// @access  Private
export const createRMA = async (req, res, next) => {
  try {
    const { ticketId, requestReason, shippingDetails } = req.body;

    // Validate ticket
    const ticket = await Ticket.findById(ticketId)
      .populate({
        path: 'assetId',
        populate: { path: 'siteId' }
      })
      .populate('siteId');
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Check if active RMA exists
    const existingRMA = await RMARequest.findOne({
      ticketId,
      status: { $nin: ['Installed', 'Rejected'] }
    });

    if (existingRMA) {
      return res.status(400).json({ success: false, message: 'Active RMA request already exists for this ticket' });
    }

    const asset = ticket.assetId;
    if (!asset) {
      return res.status(400).json({ success: false, message: 'Ticket has no associated asset' });
    }

    // Extract siteId properly - try ticket first, then fall back to asset's siteId
    let siteIdValue = ticket.siteId?._id || ticket.siteId;

    // If ticket doesn't have siteId, try to get it from the asset
    if (!siteIdValue && asset.siteId) {
      siteIdValue = asset.siteId?._id || asset.siteId;
    }

    if (!siteIdValue) {
      return res.status(400).json({ success: false, message: 'Unable to determine site for RMA. Please ensure ticket or asset has a site assigned.' });
    }

    // Check for Direct RMA Generate permission
    const isDirectRMA = (['Admin', 'Supervisor'].includes(req.user.role)) ||
      (req.user.rights?.globalRights?.includes('DIRECT_RMA_GENERATE')) ||
      (req.user.rights?.siteRights?.some(sr => sr.site.toString() === siteIdValue.toString() && sr.rights?.includes('DIRECT_RMA_GENERATE')));

    const initialStatus = isDirectRMA ? 'Approved' : 'Requested';

    const rma = await RMARequest.create({
      ticketId,
      siteId: siteIdValue,
      originalAssetId: asset._id,
      originalDetailsSnapshot: {
        serialNumber: asset.serialNumber,
        ipAddress: asset.ipAddress,
        mac: asset.mac,
        model: asset.model,
        make: asset.make
      },
      requestReason,
      shippingDetails,
      requestedBy: req.user._id,
      approvedBy: isDirectRMA ? req.user._id : undefined,
      approvedOn: isDirectRMA ? new Date() : undefined,
      status: initialStatus,
      timeline: [{
        status: initialStatus,
        changedBy: req.user._id,
        remarks: isDirectRMA ? 'Directly created and approved' : requestReason
      }]
    });

    // Populate RMA for email
    await rma.populate('originalAssetId', 'assetCode assetType serialNumber ipAddress');

    // Log activity on ticket with detailed information
    await TicketActivity.create({
      ticketId: ticket._id,
      userId: req.user._id,
      activityType: 'RMA',
      content: isDirectRMA
        ? `🔄 **RMA/Device Replacement Created Directly**\n\n**Reason:** ${requestReason}\n**Asset:** ${asset.assetCode || 'N/A'} (${asset.assetType || 'Device'})\n**Current S/N:** ${asset.serialNumber || 'N/A'}\n\n_Status: Approved - Ready for procurement_`
        : `🔄 **RMA/Device Replacement Request Submitted**\n\n**Reason:** ${requestReason}\n**Asset:** ${asset.assetCode || 'N/A'} (${asset.assetType || 'Device'})\n\n_Awaiting approval from Admin/Supervisor_`
    });

    // Send email notifications to admins and users with logistics rights
    try {
      const notifyUsers = await User.find({
        $or: [
          { role: 'Admin' },
          { role: 'Supervisor' }
        ],
        isActive: true
      }).select('fullName email');

      if (notifyUsers.length > 0) {
        // Create RMA object with asset info for email
        const rmaForEmail = {
          rmaNumber: rma.rmaNumber,
          status: rma.status,
          issueDescription: requestReason,
          failureSymptoms: requestReason,
          oldSerialNumber: asset.serialNumber,
          createdAt: rma.createdAt,
          asset: {
            name: asset.assetCode,
            assetType: asset.assetType
          }
        };

        await sendRMACreationEmail(rmaForEmail, ticket, req.user, notifyUsers);
      }
    } catch (emailError) {
      console.error('Error sending RMA creation emails:', emailError);
      // Don't fail the RMA creation if email fails
    }

    res.status(201).json({
      success: true,
      data: rma,
      message: 'RMA request created successfully. Email notifications have been sent.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get RMA by Ticket ID
// @route   GET /api/rma/ticket/:ticketId
// @access  Private
export const getRMAByTicket = async (req, res, next) => {
  try {
    const rma = await RMARequest.findOne({ ticketId: req.params.ticketId })
      .populate('requestedBy', 'fullName')
      .populate('approvedBy', 'fullName')
      .populate('timeline.changedBy', 'fullName')
      .sort({ createdAt: -1 }); // Get latest if multiple exist (though usually one active)

    if (!rma) {
      return res.status(404).json({ success: false, message: 'No RMA found for this ticket' });
    }

    res.json({ success: true, data: rma });
  } catch (error) {
    next(error);
  }
};

// @desc    Get RMA History for an Asset
// @route   GET /api/rma/asset/:assetId
// @access  Private
export const getRMAHistory = async (req, res, next) => {
  try {
    const history = await RMARequest.find({ originalAssetId: req.params.assetId })
      .populate('ticketId', 'ticketNumber')
      .populate('requestedBy', 'fullName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

// @desc    Update RMA Status
// @route   PUT /api/rma/:id/status
// @access  Private (Admin/Logistics)
export const updateRMAStatus = async (req, res, next) => {
  try {
    const { status, remarks, vendorDetails, shippingDetails, replacementDetails } = req.body;
    const rma = await RMARequest.findById(req.params.id);

    if (!rma) {
      return res.status(404).json({ success: false, message: 'RMA request not found' });
    }

    // Capture previous status
    const previousStatus = rma.status;

    // Update fields
    rma.status = status;
    if (vendorDetails) rma.vendorDetails = { ...rma.vendorDetails, ...vendorDetails };
    if (shippingDetails) rma.shippingDetails = { ...rma.shippingDetails, ...shippingDetails };

    // Status Logic
    if (status === 'Approved') {
      rma.approvedBy = req.user._id;
      rma.approvedOn = new Date();
    }

    // INSTALLATION Logic
    if (status === 'Installed') {
      if (!replacementDetails) {
        return res.status(400).json({ success: false, message: 'Replacement details required for installation' });
      }

      // 1. Update RMA Record
      rma.replacementDetails = replacementDetails;
      rma.installedBy = req.user._id;
      rma.installedOn = new Date();

      // 2. Update Actual Asset
      const asset = await Asset.findById(rma.originalAssetId);
      if (asset) {
        asset.serialNumber = replacementDetails.serialNumber;
        asset.ipAddress = replacementDetails.ipAddress;
        asset.mac = replacementDetails.mac;
        if (replacementDetails.model) asset.model = replacementDetails.model;
        // Maybe reset status to Operational?
        asset.status = 'Operational';
        await asset.save();
      }

      // 3. Update Ticket ?
      // Often we set ticket to 'InProgress' or 'Resolved' depending on workflow.
      // Let's keep it simple, leave ticket status management to the engineer, 
      // but log the installation.
    }

    // Add to timeline
    rma.timeline.push({
      status,
      changedBy: req.user._id,
      remarks: remarks || `Status changed from ${previousStatus} to ${status}`
    });

    await rma.save();

    // Notify on Ticket with detailed status message
    let statusMessage = '';
    const statusIcon = {
      'Approved': '✅',
      'Rejected': '❌',
      'Ordered': '📦',
      'Dispatched': '🚚',
      'Received': '📥',
      'Installed': '🔧'
    };

    switch (status) {
      case 'Approved':
        statusMessage = `${statusIcon[status]} **RMA Request Approved**\n\nThe device replacement request has been approved and is ready for procurement.${remarks ? `\n\n**Remarks:** ${remarks}` : ''}`;
        break;
      case 'Rejected':
        statusMessage = `${statusIcon[status]} **RMA Request Rejected**\n\nThe device replacement request has been declined.${remarks ? `\n\n**Reason:** ${remarks}` : ''}`;
        break;
      case 'Ordered':
        statusMessage = `${statusIcon[status]} **Replacement Device Ordered**\n\nA replacement device has been ordered from the vendor.${vendorDetails?.vendorName ? `\n\n**Vendor:** ${vendorDetails.vendorName}` : ''}${vendorDetails?.orderId ? `\n**Order ID:** ${vendorDetails.orderId}` : ''}${remarks ? `\n**Remarks:** ${remarks}` : ''}`;
        break;
      case 'Dispatched':
        statusMessage = `${statusIcon[status]} **Replacement Device Dispatched**\n\nThe replacement device is on its way.${shippingDetails?.carrier ? `\n\n**Carrier:** ${shippingDetails.carrier}` : ''}${shippingDetails?.trackingNumber ? `\n**Tracking:** ${shippingDetails.trackingNumber}` : ''}${remarks ? `\n**Remarks:** ${remarks}` : ''}`;
        break;
      case 'Received':
        statusMessage = `${statusIcon[status]} **Replacement Device Received**\n\nThe replacement device has been received and is ready for installation.${remarks ? `\n\n**Remarks:** ${remarks}` : ''}`;
        break;
      case 'Installed':
        statusMessage = `${statusIcon[status]} **Replacement Device Installed**\n\nThe new device has been successfully installed.${replacementDetails?.serialNumber ? `\n\n**New S/N:** ${replacementDetails.serialNumber}` : ''}${replacementDetails?.ipAddress ? `\n**New IP:** ${replacementDetails.ipAddress}` : ''}${remarks ? `\n**Remarks:** ${remarks}` : ''}`;
        break;
      default:
        statusMessage = `RMA Status Updated: ${status}.${remarks ? ` ${remarks}` : ''}`;
    }

    await TicketActivity.create({
      ticketId: rma.ticketId,
      userId: req.user._id,
      activityType: 'RMA',
      content: statusMessage
    });

    res.json({ success: true, data: rma });
  } catch (error) {
    next(error);
  }
};
