import AssetUpdateRequest from '../models/AssetUpdateRequest.model.js';
import RMARequest from '../models/RMARequest.model.js';
import Asset from '../models/Asset.model.js';
import Ticket from '../models/Ticket.model.js';
import TicketActivity from '../models/TicketActivity.model.js';
import crypto from 'crypto';

// @desc    Initiate asset update request (when engineer marks RMA as ready to install)
// @route   POST /api/asset-update-requests/initiate
// @access  Private (Engineers)
export const initiateAssetUpdateRequest = async (req, res, next) => {
  try {
    const { rmaId, ticketId, assetId } = req.body;

    // Validate RMA, ticket, and asset
    const [rma, ticket, asset] = await Promise.all([
      RMARequest.findById(rmaId),
      Ticket.findById(ticketId),
      Asset.findById(assetId)
    ]);

    if (!rma) return res.status(404).json({ success: false, message: 'RMA not found' });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

    // Check if there's already an active request
    const existingRequest = await AssetUpdateRequest.findOne({
      rmaId,
      status: 'Pending',
      accessExpiresAt: { $gt: new Date() }
    });

    if (existingRequest && !existingRequest.submittedAt) {
      // Return existing request if still valid
      return res.json({
        success: true,
        data: existingRequest,
        message: 'Active update request already exists'
      });
    }

    // Generate unique access token
    const accessToken = crypto.randomBytes(32).toString('hex');

    // Set expiration to 30 minutes from now
    const accessExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Capture original values
    const originalValues = {
      serialNumber: asset.serialNumber,
      ipAddress: asset.ipAddress,
      mac: asset.mac,
      model: asset.model,
      make: asset.make,
      locationName: asset.locationName,
      locationDescription: asset.locationDescription,
      userName: asset.userName,
      remark: asset.remark,
      installationDate: asset.installationDate,
      warrantyEndDate: asset.warrantyEndDate,
      vmsReferenceId: asset.vmsReferenceId,
      nmsReferenceId: asset.nmsReferenceId,
    };

    // Create the update request
    const updateRequest = await AssetUpdateRequest.create({
      rmaId,
      ticketId,
      assetId,
      requestedBy: req.user._id,
      originalValues,
      accessToken,
      accessExpiresAt
    });

    // Log activity with detailed information
    await TicketActivity.create({
      ticketId: ticket._id,
      userId: req.user._id,
      activityType: 'RMA',
      content: `**Asset Update Access Requested**\n\nTemporary access has been granted to update device details.\n\n**Asset:** ${asset.assetCode || 'N/A'} (${asset.assetType || 'Device'})\n**Access Expires In:** 30 minutes\n**Editable Fields:** Serial Number, IP, MAC, Dates, Credentials, and Remarks\n\n_Waiting for engineer to submit new device details..._`
    });

    res.status(201).json({
      success: true,
      data: updateRequest,
      message: 'Asset update access granted for 30 minutes'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate access token and check if still valid
// @route   GET /api/asset-update-requests/validate/:token
// @access  Public (token-based)
export const validateAccessToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    const updateRequest = await AssetUpdateRequest.findOne({ accessToken: token })
      .populate('assetId')
      .populate('rmaId')
      .populate('ticketId', 'ticketNumber');

    if (!updateRequest) {
      return res.status(404).json({ success: false, message: 'Invalid access token' });
    }

    // Check if expired
    if (!updateRequest.isAccessValid()) {
      if (updateRequest.status === 'Pending' && !updateRequest.submittedAt) {
        updateRequest.status = 'Expired';
        await updateRequest.save();
      }
      return res.status(403).json({
        success: false,
        message: 'Access expired or already used',
        expired: true
      });
    }

    res.json({
      success: true,
      data: updateRequest,
      timeRemaining: Math.floor((updateRequest.accessExpiresAt - new Date()) / 1000) // seconds
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit proposed asset changes
// @route   PUT /api/asset-update-requests/:token/submit
// @access  Public (token-based)
export const submitAssetChanges = async (req, res, next) => {
  try {
    const { token } = req.params;
    const proposedChanges = req.body;

    const updateRequest = await AssetUpdateRequest.findOne({ accessToken: token });

    if (!updateRequest) {
      return res.status(404).json({ success: false, message: 'Invalid access token' });
    }

    // Validate access
    if (!updateRequest.isAccessValid()) {
      updateRequest.status = 'Expired';
      await updateRequest.save();
      return res.status(403).json({
        success: false,
        message: 'Access expired',
        expired: true
      });
    }

    // RMA mode: Allow these fields to be updated
    const allowedFields = [
      'serialNumber', 'ipAddress', 'mac',
      'installationDate', 'warrantyEndDate',
      'vmsReferenceId', 'nmsReferenceId',
      'userName', 'password', 'remark'
    ];
    const filteredChanges = {};

    for (const field of allowedFields) {
      if (proposedChanges[field] !== undefined) {
        filteredChanges[field] = proposedChanges[field];
      }
    }

    // Ensure at least one allowed field is provided
    if (Object.keys(filteredChanges).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one of serialNumber, ipAddress, or mac is required'
      });
    }

    // Store only the allowed proposed changes
    updateRequest.proposedChanges = filteredChanges;
    updateRequest.submittedAt = new Date();
    await updateRequest.save();

    // Log activity with detailed proposed changes
    let changeDetails = [];
    if (filteredChanges.serialNumber) changeDetails.push(`**New Serial Number:** ${filteredChanges.serialNumber}`);
    if (filteredChanges.ipAddress) changeDetails.push(`**New IP Address:** ${filteredChanges.ipAddress}`);
    if (filteredChanges.mac) changeDetails.push(`**New MAC Address:** ${filteredChanges.mac}`);
    if (filteredChanges.remark) changeDetails.push(`**Remarks:** ${filteredChanges.remark}`);

    await TicketActivity.create({
      ticketId: updateRequest.ticketId,
      userId: updateRequest.requestedBy,
      activityType: 'RMA',
      content: `**Device Update Details Submitted**\n\nNew device details have been submitted for approval.\n\n${changeDetails.join('\n')}\n\n_Awaiting Admin/Supervisor approval to apply these changes..._`
    });

    res.json({
      success: true,
      data: updateRequest,
      message: 'Changes submitted successfully. Waiting for admin approval.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending update request for a ticket/RMA
// @route   GET /api/asset-update-requests/ticket/:ticketId
// @access  Private
export const getPendingRequestByTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    const updateRequest = await AssetUpdateRequest.findOne({
      ticketId,
      status: 'Pending'
    })
      .populate('requestedBy', 'fullName')
      .populate('assetId')
      .populate('rmaId')
      .sort({ createdAt: -1 });

    if (!updateRequest) {
      return res.status(404).json({ success: false, message: 'No pending update request found' });
    }

    res.json({ success: true, data: updateRequest });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve asset update request
// @route   POST /api/asset-update-requests/:id/approve
// @access  Private (Admin/Supervisor)
export const approveAssetUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;

    const updateRequest = await AssetUpdateRequest.findById(id);

    if (!updateRequest) {
      return res.status(404).json({ success: false, message: 'Update request not found' });
    }

    if (updateRequest.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve request with status: ${updateRequest.status}`
      });
    }

    if (!updateRequest.submittedAt) {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve request that has not been submitted yet'
      });
    }

    // Apply changes to asset
    const asset = await Asset.findById(updateRequest.assetId);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    // Update asset with proposed changes
    const changes = updateRequest.proposedChanges;
    if (changes.serialNumber) asset.serialNumber = changes.serialNumber;
    if (changes.ipAddress) asset.ipAddress = changes.ipAddress;
    if (changes.mac) asset.mac = changes.mac;
    if (changes.model) asset.model = changes.model;
    if (changes.make) asset.make = changes.make;
    if (changes.locationName) asset.locationName = changes.locationName;
    if (changes.locationDescription) asset.locationDescription = changes.locationDescription;
    if (changes.userName) asset.userName = changes.userName;
    if (changes.password) asset.password = changes.password;
    if (changes.remark) asset.remark = changes.remark;
    if (changes.installationDate) asset.installationDate = changes.installationDate;
    if (changes.warrantyEndDate) asset.warrantyEndDate = changes.warrantyEndDate;
    if (changes.vmsReferenceId) asset.vmsReferenceId = changes.vmsReferenceId;
    if (changes.nmsReferenceId) asset.nmsReferenceId = changes.nmsReferenceId;

    // Set status to operational after RMA
    asset.status = 'Operational';

    await asset.save();

    // Update request status
    updateRequest.status = 'Approved';
    updateRequest.approvedBy = req.user._id;
    updateRequest.approvedAt = new Date();
    await updateRequest.save();

    // Update RMA status to Installed
    const rma = await RMARequest.findById(updateRequest.rmaId);
    if (rma) {
      rma.status = 'Installed';
      rma.replacementDetails = {
        serialNumber: changes.serialNumber || asset.serialNumber,
        ipAddress: changes.ipAddress || asset.ipAddress,
        mac: changes.mac || asset.mac,
      };
      rma.installedBy = updateRequest.requestedBy;
      rma.installedOn = new Date();

      rma.timeline.push({
        status: 'Installed',
        changedBy: req.user._id,
        remarks: 'Asset update approved and installed'
      });

      await rma.save();
    }

    // Log activity with details of approved changes
    let appliedChanges = [];
    if (changes.serialNumber) appliedChanges.push(`**Serial Number:** ${changes.serialNumber}`);
    if (changes.ipAddress) appliedChanges.push(`**IP Address:** ${changes.ipAddress}`);
    if (changes.mac) appliedChanges.push(`**MAC Address:** ${changes.mac}`);

    await TicketActivity.create({
      ticketId: updateRequest.ticketId,
      userId: req.user._id,
      activityType: 'RMA',
      content: `**Device Update Approved & Applied**\n\nThe asset details have been successfully updated.\n\n${appliedChanges.join('\n')}\n\n_Device replacement completed. Asset is now operational._`
    });

    res.json({
      success: true,
      data: updateRequest,
      message: 'Asset update approved and applied successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject asset update request
// @route   POST /api/asset-update-requests/:id/reject
// @access  Private (Admin/Supervisor)
export const rejectAssetUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const updateRequest = await AssetUpdateRequest.findById(id);

    if (!updateRequest) {
      return res.status(404).json({ success: false, message: 'Update request not found' });
    }

    if (updateRequest.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject request with status: ${updateRequest.status}`
      });
    }

    updateRequest.status = 'Rejected';
    updateRequest.approvedBy = req.user._id;
    updateRequest.approvedAt = new Date();
    updateRequest.rejectionReason = reason || 'No reason provided';
    await updateRequest.save();

    // Log activity with rejection details
    await TicketActivity.create({
      ticketId: updateRequest.ticketId,
      userId: req.user._id,
      activityType: 'RMA',
      content: `**Device Update Rejected**\n\nThe submitted device details have been rejected.\n\n**Reason:** ${updateRequest.rejectionReason}\n\n_The engineer may need to re-initiate the update request with correct details._`
    });

    res.json({
      success: true,
      data: updateRequest,
      message: 'Asset update rejected'
    });
  } catch (error) {
    next(error);
  }
};
