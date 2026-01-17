import RMARequest from '../models/RMARequest.model.js';
import Ticket from '../models/Ticket.model.js';
import Asset from '../models/Asset.model.js';
import TicketActivity from '../models/TicketActivity.model.js';

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
      timeline: [{
        status: 'Requested',
        changedBy: req.user._id,
        remarks: requestReason
      }]
    });
    
    // Log activity on ticket
    await TicketActivity.create({
        ticketId: ticket._id,
        userId: req.user._id,
        activityType: 'RMA',
        content: `RMA Request Initiated: ${requestReason}`
    });

    res.status(201).json({ success: true, data: rma });
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
    
    // Notify on Ticket
    await TicketActivity.create({
        ticketId: rma.ticketId,
        userId: req.user._id,
        activityType: 'RMA',
        content: `RMA Status Updated: ${status}. ${remarks || ''}`
    });

    res.json({ success: true, data: rma });
  } catch (error) {
    next(error);
  }
};
