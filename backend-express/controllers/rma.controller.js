import RMARequest from '../models/RMARequest.model.js';
import Ticket from '../models/Ticket.model.js';
import Asset from '../models/Asset.model.js';
import TicketActivity from '../models/TicketActivity.model.js';
import User from '../models/User.model.js';
import Site from '../models/Site.model.js';
import StockTransfer from '../models/StockTransfer.model.js';
import Requisition from '../models/Requisition.model.js';
import StockMovementLog from '../models/StockMovementLog.model.js';
import DailyWorkLog from '../models/DailyWorkLog.model.js';
import { sendRMACreationEmail, sendRMAMilestoneEmail } from '../utils/email.utils.js';
import { decrypt, isEncrypted } from '../utils/encryption.utils.js';

// Helper: decrypt sensitive fields in originalDetailsSnapshot
const decryptSnapshot = (rmaObj) => {
  if (!rmaObj) return rmaObj;
  const obj = rmaObj.toObject ? rmaObj.toObject() : { ...rmaObj };
  if (obj.originalDetailsSnapshot) {
    const snap = obj.originalDetailsSnapshot;
    for (const field of ['ipAddress', 'mac', 'serialNumber', 'userName', 'password']) {
      if (snap[field] && isEncrypted(snap[field])) {
        try {
          snap[field] = decrypt(snap[field]);
        } catch (err) {
          console.error(`[RMA] Failed to decrypt snapshot.${field}:`, err.message);
        }
      }
    }
  }
  return obj;
};

// HO Stock auto-transfer threshold (if stock quantity > this, auto-approve transfer)
const HO_STOCK_AUTO_TRANSFER_THRESHOLD = 2;

// Helper function to perform asset swap for stock-based replacements
const performAssetSwap = async (rma, req) => {
  if (!rma.reservedAssetId) return null;

  const reservedAsset = await Asset.findById(rma.reservedAssetId);
  const originalAsset = await Asset.findById(rma.originalAssetId);
  if (!reservedAsset || !originalAsset) return null;

  // Store original details in replacement (for audit)
  const oldSerial = originalAsset.serialNumber;
  const newSerial = reservedAsset.serialNumber;

  // Replace the original asset's identity with the reserved asset
  originalAsset.serialNumber = reservedAsset.serialNumber;
  originalAsset.mac = reservedAsset.mac;
  originalAsset.make = reservedAsset.make;
  originalAsset.model = reservedAsset.model;
  originalAsset.status = 'Operational';
  await originalAsset.save();

  // Mark the reserved spare as used/replaced
  reservedAsset.status = 'Replaced';
  reservedAsset.reservedByRma = undefined;
  await reservedAsset.save();

  // Save replacement details on RMA
  rma.replacementDetails = {
    serialNumber: newSerial,
    mac: reservedAsset.mac,
    model: reservedAsset.model,
    make: reservedAsset.make
  };

  return { oldSerial, newSerial };
};

// @desc    Get all RMA records
// @route   GET /api/rma
// @access  Private
export const getAllRMAs = async (req, res, next) => {
  try {
    const { status, siteId, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (siteId) filter.siteId = siteId;

    // Non-admin users can only see RMAs from their site
    if (!['Admin', 'Supervisor'].includes(req.user.role)) {
      if (req.user.siteId) {
        filter.siteId = req.user.siteId;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [rmas, total] = await Promise.all([
      RMARequest.find(filter)
        .populate('ticketId', 'ticketNumber status')
        .populate('siteId', 'siteName siteUniqueID')
        .populate('originalAssetId', 'assetCode assetType serialNumber')
        .populate('requestedBy', 'fullName')
        .populate('approvedBy', 'fullName')
        .populate('timeline.changedBy', 'fullName')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      RMARequest.countDocuments(filter)
    ]);

    // Decrypt snapshot fields for display
    const decryptedRmas = rmas.map(r => decryptSnapshot(r));

    res.json({
      success: true,
      data: decryptedRmas,
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
    const {
      ticketId,
      requestReason,
      shippingDetails,
      isSiteStockUsed,
      faultyItemAction,
      replacementSource,
      reservedAssetId
    } = req.body;

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

    // Extract siteId properly
    let siteIdValue = ticket.siteId?._id || ticket.siteId;
    if (!siteIdValue && asset.siteId) {
      siteIdValue = asset.siteId?._id || asset.siteId;
    }
    if (!siteIdValue) {
      return res.status(400).json({ success: false, message: 'Unable to determine site for RMA.' });
    }

    // Check for Direct RMA Generate permission
    const isDirectRMA = (['Admin', 'Supervisor'].includes(req.user.role)) ||
      (req.user.rights?.globalRights?.includes('DIRECT_RMA_GENERATE')) ||
      (req.user.rights?.siteRights?.some(sr => sr.site.toString() === siteIdValue.toString() && sr.rights?.includes('DIRECT_RMA_GENERATE')));

    // Map the new simplified sources to behavior
    const effectiveSource = replacementSource || 'RepairOnly';

    // All RMAs start as 'Requested' and require Admin approval
    let initialStatus = 'Requested';

    // If admin/direct, auto-approve
    if (isDirectRMA) {
      initialStatus = 'Approved';
    }

    const rma = await RMARequest.create({
      ticketId,
      siteId: siteIdValue,
      originalAssetId: asset._id,
      originalDetailsSnapshot: {
        assetCode: asset.assetCode,
        serialNumber: isEncrypted(asset.serialNumber) ? decrypt(asset.serialNumber) : asset.serialNumber,
        ipAddress: isEncrypted(asset.ipAddress) ? decrypt(asset.ipAddress) : asset.ipAddress,
        mac: isEncrypted(asset.mac) ? decrypt(asset.mac) : asset.mac,
        model: asset.model,
        make: asset.make
      },
      requestReason,
      shippingDetails,
      requestedBy: req.user._id,
      approvedBy: isDirectRMA ? req.user._id : undefined,
      approvedOn: isDirectRMA ? new Date() : undefined,
      status: initialStatus,
      isSiteStockUsed: effectiveSource === 'SiteStock',
      faultyItemAction: faultyItemAction || 'Repair',
      replacementSource: effectiveSource,
      reservedAssetId: reservedAssetId || undefined,
      repairedItemDestination: 'BackToSite',
      timeline: [{
        status: initialStatus,
        changedBy: req.user._id,
        remarks: isDirectRMA
          ? 'RMA created & approved directly'
          : `RMA request submitted: ${requestReason}`
      }]
    });

    // If stock-based and auto-approved with reserved asset, reserve it
    if (isDirectRMA && reservedAssetId && (effectiveSource === 'SiteStock' || effectiveSource === 'HOStock')) {
      const reservedAsset = await Asset.findById(reservedAssetId);
      if (reservedAsset) {
        const fromStatus = reservedAsset.status;
        reservedAsset.status = 'Reserved';
        reservedAsset.reservedByRma = rma._id;
        await reservedAsset.save();

        await StockMovementLog.logMovement({
          asset: reservedAsset,
          movementType: 'Reserved',
          fromSiteId: reservedAsset.siteId,
          toSiteId: reservedAsset.siteId,
          fromStatus,
          toStatus: 'Reserved',
          performedBy: req.user._id,
          rmaId: rma._id,
          ticketId: ticket._id,
          notes: `RMA ${rma.rmaNumber} - Asset reserved for replacement`
        });
      }
    }

    // Map RMA to Ticket
    ticket.rmaId = rma._id;
    ticket.rmaNumber = rma.rmaNumber;
    await ticket.save();

    // Populate for email
    await rma.populate('originalAssetId', 'assetCode assetType serialNumber ipAddress');

    // Log activity on ticket
    await TicketActivity.create({
      ticketId: ticket._id,
      userId: req.user._id,
      activityType: 'RMA',
      content: isDirectRMA
        ? `**RMA Created & Approved**\n\n**RMA Number:** ${rma.rmaNumber}\n**Type:** ${effectiveSource === 'RepairOnly' ? 'Repair Only' : effectiveSource === 'RepairAndReplace' ? 'Repair & Replace' : effectiveSource}\n**Reason:** ${requestReason}\n**Asset:** ${asset.assetCode || 'N/A'} (${asset.assetType || 'Device'})`
        : `**RMA Request Submitted**\n\n**RMA Number:** ${rma.rmaNumber}\n**Type:** ${effectiveSource === 'RepairOnly' ? 'Repair Only' : effectiveSource === 'RepairAndReplace' ? 'Repair & Replace' : effectiveSource}\n**Reason:** ${requestReason}\n_Awaiting Admin approval_`
    });

    // Send email notifications
    try {
      const notifyUsers = await User.find({
        $or: [{ role: 'Admin' }, { role: 'Supervisor' }],
        isActive: true
      }).select('fullName email');

      if (notifyUsers.length > 0) {
        const rmaForEmail = {
          rmaNumber: rma.rmaNumber,
          status: rma.status,
          issueDescription: requestReason,
          failureSymptoms: requestReason,
          oldSerialNumber: asset.serialNumber,
          createdAt: rma.createdAt,
          asset: { name: asset.assetCode, assetType: asset.assetType }
        };
        await sendRMACreationEmail(rmaForEmail, ticket, req.user, notifyUsers);
      }
    } catch (emailError) {
      console.error('Error sending RMA creation emails:', emailError);
    }

    res.status(201).json({
      success: true,
      data: rma,
      message: 'RMA request created successfully.'
    });

    // Fire-and-forget: log activity
    DailyWorkLog.logActivity(req.user._id, {
      category: 'RMACreated',
      description: `Created RMA ${rma.rmaNumber} for ticket ${ticket.ticketNumber}`,
      refModel: 'RMARequest',
      refId: rma._id,
      metadata: { rmaNumber: rma.rmaNumber, ticketNumber: ticket.ticketNumber }
    }).catch(() => { });
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
      .populate('receivedAtHOBy', 'fullName')
      .populate('repairedItemReceivedAtHOBy', 'fullName')
      .populate('timeline.changedBy', 'fullName')
      .sort({ createdAt: -1 });

    if (!rma) {
      return res.status(404).json({ success: false, message: 'No RMA found for this ticket' });
    }

    // Decrypt snapshot fields for display
    const decryptedRma = decryptSnapshot(rma);

    res.json({ success: true, data: decryptedRma });
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

    const decryptedHistory = history.map(r => decryptSnapshot(r));
    res.json({ success: true, data: decryptedHistory });
  } catch (error) {
    next(error);
  }
};

// @desc    Update RMA Status
// @route   PUT /api/rma/:id/status
// @access  Private (Admin/Logistics/L1)
export const updateRMAStatus = async (req, res, next) => {
  try {
    let {
      status,
      remarks,
      vendorDetails,
      shippingDetails,
      replacementDetails,
      deliveredItemDestination,
      repairedItemDestination,
      repairedItemDestinationSiteId,
      // New workflow fields
      itemSendRoute,
      logisticsToHO,
      logisticsToServiceCenter,
      logisticsReturnToSite,
      serviceCenterTicketRef
    } = req.body;

    const rma = await RMARequest.findById(req.params.id);
    if (!rma) {
      return res.status(404).json({ success: false, message: 'RMA request not found' });
    }

    const previousStatus = rma.status;

    // Helper: check if both tracks are done and finalize
    const checkAndFinalizeRMA = (rmaDoc) => {
      const repairDone = ['Installed', 'CompletedToHOStock'].includes(rmaDoc.repairTrackStatus);
      const replacementDone = rmaDoc.replacementTrackStatus === 'NotRequired'
        || rmaDoc.replacementTrackStatus === 'Installed';
      if (repairDone && replacementDone) {
        rmaDoc.status = 'Installed';
        rmaDoc.isFaultyItemFinalized = true;
      }
    };

    // === STATUS TRANSITION LOGIC ===

    // ADMIN: Approve or Reject
    if (status === 'Approved') {
      rma.approvedBy = req.user._id;
      rma.approvedOn = new Date();
      rma.status = 'Approved';

      // Initialize parallel track statuses
      rma.repairTrackStatus = 'Pending';
      if (rma.replacementSource === 'RepairAndReplace') {
        rma.replacementTrackStatus = 'Pending';
        const { replacementStockSource: stockSource, replacementSourceSiteId: sourceId } = req.body;
        if (stockSource) rma.replacementStockSource = stockSource;
        if (sourceId) rma.replacementSourceSiteId = sourceId;
      } else {
        rma.replacementTrackStatus = 'NotRequired';
      }
    }

    if (status === 'Rejected') {
      rma.status = 'Rejected';
      // Release reserved asset if any
      if (rma.reservedAssetId) {
        const reservedAsset = await Asset.findById(rma.reservedAssetId);
        if (reservedAsset) {
          const fromStatus = reservedAsset.status;
          reservedAsset.status = 'Spare';
          reservedAsset.reservedByRma = undefined;
          await reservedAsset.save();

          await StockMovementLog.logMovement({
            asset: reservedAsset,
            movementType: 'Released',
            fromSiteId: reservedAsset.siteId,
            toSiteId: reservedAsset.siteId,
            fromStatus,
            toStatus: 'Spare',
            performedBy: req.user._id,
            rmaId: rma._id,
            ticketId: rma.ticketId,
            notes: `RMA ${rma.rmaNumber} - Reservation released (RMA rejected)`
          });
        }
      }
    }

    // L1: Send item directly to Service Center
    if (status === 'SentToServiceCenter') {
      rma.status = 'SentToServiceCenter';
      rma.repairTrackStatus = 'SentToServiceCenter';
      rma.itemSendRoute = 'DirectToServiceCenter';
      rma.repairDispatchDate = new Date();
      if (logisticsToServiceCenter) {
        rma.logisticsToServiceCenter = {
          ...rma.logisticsToServiceCenter,
          ...logisticsToServiceCenter,
          dispatchDate: new Date()
        };
      }
      if (shippingDetails) rma.shippingDetails = { ...rma.shippingDetails, ...shippingDetails };

      // Mark asset as In Repair
      const faultyAsset = await Asset.findById(rma.originalAssetId);
      if (faultyAsset) {
        const fromStatus = faultyAsset.status;
        faultyAsset.status = 'In Repair';
        await faultyAsset.save();

        await StockMovementLog.logMovement({
          asset: faultyAsset,
          movementType: 'StatusChange',
          fromSiteId: faultyAsset.siteId,
          toSiteId: faultyAsset.siteId,
          fromStatus,
          toStatus: 'In Repair',
          performedBy: req.user._id,
          rmaId: rma._id,
          ticketId: rma.ticketId,
          notes: `RMA ${rma.rmaNumber} - Item sent directly to service center`
        });
      }
    }

    // L1: Send item to HO
    if (status === 'SentToHO') {
      rma.status = 'SentToHO';
      rma.repairTrackStatus = 'SentToHO';
      rma.itemSendRoute = 'ToHO';
      if (logisticsToHO) {
        rma.logisticsToHO = {
          ...rma.logisticsToHO,
          ...logisticsToHO,
          dispatchDate: new Date()
        };
      }
      if (shippingDetails) rma.shippingDetails = { ...rma.shippingDetails, ...shippingDetails };
    }

    // ADMIN: Acknowledge receipt at HO
    if (status === 'ReceivedAtHO') {
      rma.status = 'ReceivedAtHO';
      rma.repairTrackStatus = 'ReceivedAtHO';
      rma.receivedAtHOBy = req.user._id;
      rma.receivedAtHODate = new Date();
      if (rma.logisticsToHO) {
        rma.logisticsToHO.receivedDate = new Date();
      }
    }

    // ADMIN: Send item from HO to Service Center
    if (status === 'SentForRepairFromHO') {
      rma.status = 'SentForRepairFromHO';
      rma.repairTrackStatus = 'SentForRepair';
      rma.repairDispatchDate = new Date();
      if (logisticsToServiceCenter) {
        rma.logisticsToServiceCenter = {
          ...rma.logisticsToServiceCenter,
          ...logisticsToServiceCenter,
          dispatchDate: new Date()
        };
      }
      if (serviceCenterTicketRef) {
        if (!rma.logisticsToServiceCenter) rma.logisticsToServiceCenter = {};
        rma.logisticsToServiceCenter.serviceCenterTicketRef = serviceCenterTicketRef;
      }

      // Mark asset as in repair
      const faultyAsset = await Asset.findById(rma.originalAssetId);
      if (faultyAsset) {
        const fromStatus = faultyAsset.status;
        faultyAsset.status = 'In Repair';
        await faultyAsset.save();

        await StockMovementLog.logMovement({
          asset: faultyAsset,
          movementType: 'StatusChange',
          fromSiteId: faultyAsset.siteId,
          toSiteId: faultyAsset.siteId,
          fromStatus,
          toStatus: 'In Repair',
          performedBy: req.user._id,
          rmaId: rma._id,
          ticketId: rma.ticketId,
          notes: `RMA ${rma.rmaNumber} - Item sent from HO to service center for repair`
        });
      }
    }

    // ADMIN: Repaired item received back at HO (Admin answers Yes)
    if (status === 'ItemRepairedAtHO') {
      rma.status = 'ItemRepairedAtHO';
      rma.repairTrackStatus = 'Repaired';
      rma.repairedItemReceivedAtHO = true;
      rma.repairedItemReceivedAtHOBy = req.user._id;
      rma.repairedItemReceivedAtHODate = new Date();
      rma.repairReceivedDate = new Date();

      // Update asset status
      const repairedAsset = await Asset.findById(rma.originalAssetId);
      if (repairedAsset) {
        const fromStatus = repairedAsset.status;
        repairedAsset.status = 'Spare'; // Repaired, waiting to be shipped
        await repairedAsset.save();

        await StockMovementLog.logMovement({
          asset: repairedAsset,
          movementType: 'StatusChange',
          fromSiteId: repairedAsset.siteId,
          toSiteId: repairedAsset.siteId,
          fromStatus,
          toStatus: 'Spare',
          performedBy: req.user._id,
          rmaId: rma._id,
          ticketId: rma.ticketId,
          notes: `RMA ${rma.rmaNumber} - Repaired item received back at HO`
        });
      }
    }

    // ADMIN: Ship repaired/replacement item back to site (with destination selection)
    if (status === 'ReturnShippedToSite') {
      rma.status = 'ReturnShippedToSite';
      rma.repairTrackStatus = 'ReturnShipped';
      if (logisticsReturnToSite) {
        rma.logisticsReturnToSite = {
          ...rma.logisticsReturnToSite,
          ...logisticsReturnToSite,
          dispatchDate: new Date()
        };
      }
      if (shippingDetails) rma.shippingDetails = { ...rma.shippingDetails, ...shippingDetails };

      // Save repaired item destination (Admin decision)
      if (repairedItemDestination) {
        rma.repairedItemDestination = repairedItemDestination;
      }
      if (repairedItemDestinationSiteId) {
        rma.overrideDestinationSiteId = repairedItemDestinationSiteId;
        rma.overrideApprovedBy = req.user._id;
      }

      // Handle HOStock destination — move asset to HO spare stock immediately
      if (repairedItemDestination === 'HOStock') {
        const hoSite = await Site.findOne({ isHeadOffice: true });
        if (hoSite) {
          const repairedAsset = await Asset.findById(rma.originalAssetId);
          if (repairedAsset) {
            const fromSiteId = repairedAsset.siteId;
            const fromStatus = repairedAsset.status;
            repairedAsset.status = 'Spare';
            repairedAsset.siteId = hoSite._id;
            repairedAsset.stockLocation = 'HO Stock (from repair)';
            repairedAsset.locationDescription = `Repaired item added to HO stock - RMA ${rma.rmaNumber}`;
            await repairedAsset.save();

            await StockMovementLog.logMovement({
              asset: repairedAsset,
              movementType: 'Transfer',
              fromSiteId,
              toSiteId: hoSite._id,
              fromStatus,
              toStatus: 'Spare',
              performedBy: req.user._id,
              rmaId: rma._id,
              ticketId: rma.ticketId,
              notes: `RMA ${rma.rmaNumber} - Repaired item moved to HO stock (Admin decision)`
            });
          }
        }
        // Repair track is done (item stays at HO)
        rma.repairTrackStatus = 'CompletedToHOStock';
        rma.installedOn = new Date();
        rma.installedBy = req.user._id;
        rma.installationStatus = 'Not Installed'; // It's in stock, not installed
        // Only finalize RMA if replacement track is also done
        checkAndFinalizeRMA(rma);
        if (rma.status !== 'Installed') {
          // Repair done but replacement still pending — keep a meaningful status
          rma.status = 'ItemRepairedAtHO';
        }
      }
    }

    // USER/L1: Mark received at site
    if (status === 'ReceivedAtSite') {
      rma.status = 'ReceivedAtSite';
      rma.repairTrackStatus = 'ReturnReceived';
      if (rma.logisticsReturnToSite) {
        rma.logisticsReturnToSite.receivedDate = new Date();
      }

      // Determine the actual destination site
      const destinationSiteId = (rma.repairedItemDestination === 'OtherSite' && rma.overrideDestinationSiteId)
        ? rma.overrideDestinationSiteId
        : rma.siteId;

      // Update asset - it's now at the destination site
      const assetReturned = await Asset.findById(rma.originalAssetId);
      if (assetReturned) {
        const fromSiteId = assetReturned.siteId;
        const fromStatus = assetReturned.status;
        assetReturned.status = 'Spare'; // Ready for installation
        assetReturned.siteId = destinationSiteId;
        assetReturned.locationDescription = 'Received from repair - ready for installation';
        await assetReturned.save();

        await StockMovementLog.logMovement({
          asset: assetReturned,
          movementType: 'Transfer',
          fromSiteId,
          toSiteId: destinationSiteId,
          fromStatus,
          toStatus: 'Spare',
          performedBy: req.user._id,
          rmaId: rma._id,
          ticketId: rma.ticketId,
          notes: `RMA ${rma.rmaNumber} - Item received at ${rma.repairedItemDestination === 'OtherSite' ? 'alternate site' : 'site'}, ready for installation`
        });
      }
    }

    // ========================================
    // REPLACEMENT STOCK WORKFLOW (Admin/Escalation scope)
    // ========================================

    // ADMIN: Raise requisition for stock transfer (replacement)
    if (status === 'ReplacementRequisitionRaised') {
      const { replacementStockSource: stockSource, replacementSourceSiteId: sourceId, logisticsReplacementToSite: replLogistics } = req.body;

      if (!stockSource) {
        return res.status(400).json({ success: false, message: 'Replacement stock source is required' });
      }

      // Only overwrite main status if repair track has completed
      // Otherwise, keep repair track status as the main status
      const repairDone = ['Installed', 'CompletedToHOStock'].includes(rma.repairTrackStatus);
      if (repairDone || rma.status === 'Approved') {
        rma.status = 'ReplacementRequisitionRaised';
      }
      rma.replacementTrackStatus = 'RequisitionRaised';
      rma.replacementStockSource = stockSource;
      rma.replacementArrangedBy = req.user._id;
      rma.replacementArrangedOn = new Date();

      // Determine source site for the requisition
      let sourceSiteId;
      if (stockSource === 'HOStock') {
        const hoSite = await Site.findOne({ isHeadOffice: true });
        sourceSiteId = hoSite?._id;
      } else if (stockSource === 'SiteStock' && sourceId) {
        sourceSiteId = sourceId;
        rma.replacementSourceSiteId = sourceId;
      }

      // Get asset type from the original asset
      const origAsset = await Asset.findById(rma.originalAssetId);
      const assetType = origAsset?.assetType || 'Device';

      if (sourceSiteId) {
        // Create a requisition record
        const requisition = await Requisition.create({
          ticketId: rma.ticketId,
          rmaId: rma._id,
          requisitionType: 'RMATransfer',
          transferDirection: stockSource === 'SiteStock' ? 'SiteToSite' : 'ToSite',
          siteId: rma.siteId,            // Destination site
          sourceSiteId: sourceSiteId,     // Source site (HO or other site)
          requestedBy: req.user._id,
          assetType: assetType,
          quantity: 1,
          status: 'Approved',  // Admin is raising this, so auto-approve
          approvedBy: req.user._id,
          approvedOn: new Date(),
          comments: `RMA ${rma.rmaNumber} - Replacement from ${stockSource === 'HOStock' ? 'HO Stock' : 'Site Stock'}`
        });

        rma.replacementRequisitionId = requisition._id;

        // Create a stock transfer record
        // Build a human-readable transfer name
        const [srcSiteName, destSiteName] = await Promise.all([
          Site.findById(sourceSiteId).select('siteName isHeadOffice'),
          Site.findById(rma.siteId).select('siteName isHeadOffice')
        ]);
        const srcLabel = srcSiteName?.isHeadOffice ? 'HO' : (srcSiteName?.siteName || 'Source');
        const destLabel = destSiteName?.isHeadOffice ? 'HO' : (destSiteName?.siteName || 'Dest');
        const trfName = `${srcLabel} → ${destLabel} | ${rma.rmaNumber}`;

        const stockTransfer = await StockTransfer.create({
          transferName: trfName,
          sourceSiteId: sourceSiteId,
          destinationSiteId: rma.siteId,
          assetIds: [],  // Will be populated when specific asset is identified
          initiatedBy: req.user._id,
          approvedBy: req.user._id,
          status: 'Approved',
          linkedTicketId: rma.ticketId,
          notes: `RMA ${rma.rmaNumber} - Stock transfer for replacement (${assetType})`
        });

        requisition.stockTransferId = stockTransfer._id;
        await requisition.save();
        rma.stockTransferId = stockTransfer._id;
      }
    }

    // ADMIN: Dispatch replacement stock to site
    if (status === 'ReplacementDispatched') {
      const { logisticsReplacementToSite: replLogistics, reservedAssetId: replAssetId, stockTransferId: selectedTransferId } = req.body;

      // Only overwrite main status if repair track has completed
      const repairDone = ['Installed', 'CompletedToHOStock'].includes(rma.repairTrackStatus);
      if (repairDone || ['ReplacementRequisitionRaised', 'Approved'].includes(rma.status)) {
        rma.status = 'ReplacementDispatched';
      }
      rma.replacementTrackStatus = 'Dispatched';

      if (replLogistics) {
        rma.logisticsReplacementToSite = {
          ...rma.logisticsReplacementToSite,
          ...replLogistics,
          dispatchDate: new Date()
        };
      }

      // Link a stock transfer if the admin selected one from the dropdown
      if (selectedTransferId && !rma.stockTransferId) {
        rma.stockTransferId = selectedTransferId;
        // Also link the ticket to the stock transfer
        try {
          await StockTransfer.findByIdAndUpdate(selectedTransferId, {
            linkedTicketId: rma.ticketId
          });
        } catch (_) { /* non-critical */ }
      }

      // If a specific replacement asset is identified, reserve it
      if (replAssetId) {
        rma.reservedAssetId = replAssetId;
        const replAsset = await Asset.findById(replAssetId);
        if (replAsset) {
          const fromStatus = replAsset.status;
          replAsset.status = 'Reserved';
          replAsset.reservedByRma = rma._id;
          await replAsset.save();

          await StockMovementLog.logMovement({
            asset: replAsset,
            movementType: 'StatusChange',
            fromSiteId: replAsset.siteId,
            toSiteId: rma.siteId,
            fromStatus,
            toStatus: 'Reserved',
            performedBy: req.user._id,
            rmaId: rma._id,
            ticketId: rma.ticketId,
            notes: `RMA ${rma.rmaNumber} - Replacement asset dispatched to site`
          });
        }

        // Update stock transfer with asset
        if (rma.stockTransferId) {
          const transfer = await StockTransfer.findById(rma.stockTransferId);
          if (transfer) {
            transfer.assetIds = [replAssetId];
            transfer.status = 'InTransit';
            transfer.transferDate = new Date();
            await transfer.save();
          }
        }
      }
    }

    // L1/TICKET OWNER: Confirm replacement received at site
    if (status === 'ReplacementReceivedAtSite') {
      // Only overwrite main status if repair track has completed
      const repairDone = ['Installed', 'CompletedToHOStock'].includes(rma.repairTrackStatus);
      if (repairDone || ['ReplacementDispatched', 'ReplacementRequisitionRaised'].includes(rma.status)) {
        rma.status = 'ReplacementReceivedAtSite';
      }
      rma.replacementTrackStatus = 'Received';

      if (rma.logisticsReplacementToSite) {
        rma.logisticsReplacementToSite.receivedDate = new Date();
      }

      // Move replacement asset to site and mark as spare (ready for installation)
      if (rma.reservedAssetId) {
        const replAsset = await Asset.findById(rma.reservedAssetId);
        if (replAsset) {
          const fromStatus = replAsset.status;
          replAsset.status = 'Spare';
          replAsset.siteId = rma.siteId;
          replAsset.locationDescription = 'Replacement received - ready for installation';
          replAsset.reservedByRma = undefined;
          await replAsset.save();

          await StockMovementLog.logMovement({
            asset: replAsset,
            movementType: 'Transfer',
            fromSiteId: replAsset.siteId,
            toSiteId: rma.siteId,
            fromStatus,
            toStatus: 'Spare',
            performedBy: req.user._id,
            rmaId: rma._id,
            ticketId: rma.ticketId,
            notes: `RMA ${rma.rmaNumber} - Replacement item received at site`
          });
        }
      }

      // Complete the stock transfer
      if (rma.stockTransferId) {
        const transfer = await StockTransfer.findById(rma.stockTransferId);
        if (transfer) {
          transfer.status = 'Completed';
          transfer.receivedDate = new Date();
          transfer.receivedBy = req.user._id;
          await transfer.save();
        }
        // Fulfill the requisition
        if (rma.replacementRequisitionId) {
          await Requisition.findByIdAndUpdate(rma.replacementRequisitionId, {
            status: 'Fulfilled',
            fulfilledOn: new Date(),
            receivedBy: req.user._id,
            fulfilledAssetId: rma.reservedAssetId
          });
        }
      }
    }

    // USER: Install device with updated details
    if (status === 'Installed') {
      // Determine which track this installation applies to
      const { installTrack } = req.body; // 'repair' or 'replacement'

      if (installTrack === 'replacement') {
        // Only update replacement track
        rma.replacementTrackStatus = 'Installed';
      } else {
        // Default: repair track installed
        rma.repairTrackStatus = 'Installed';
      }

      rma.isInstallationConfirmed = true;
      rma.installationStatus = 'Installed & Working';
      rma.installedBy = req.user._id;
      rma.installedOn = new Date();

      // Check if both tracks are complete
      checkAndFinalizeRMA(rma);

      // Update asset with new details
      const installedAsset = await Asset.findById(rma.originalAssetId);
      if (installedAsset) {
        installedAsset.status = 'Operational';
        if (replacementDetails) {
          if (replacementDetails.ipAddress) installedAsset.ipAddress = replacementDetails.ipAddress;
          if (replacementDetails.serialNumber) installedAsset.serialNumber = replacementDetails.serialNumber;
          if (replacementDetails.mac) installedAsset.mac = replacementDetails.mac;
          rma.replacementDetails = { ...rma.replacementDetails, ...replacementDetails };
        }
        await installedAsset.save();

        await StockMovementLog.logMovement({
          asset: installedAsset,
          movementType: 'StatusChange',
          fromSiteId: installedAsset.siteId,
          toSiteId: installedAsset.siteId,
          fromStatus: 'Spare',
          toStatus: 'Operational',
          performedBy: req.user._id,
          rmaId: rma._id,
          ticketId: rma.ticketId,
          notes: `RMA ${rma.rmaNumber} - Device installed and operational`
        });
      }

      // Update ticket
      const ticket = await Ticket.findById(rma.ticketId);
      if (ticket) {
        ticket.rmaFinalized = true;
        ticket.rmaVerified = true;
        await ticket.save();
      }
    }

    // === LEGACY STATUS HANDLERS (backward compatibility) ===
    if (status === 'Ordered') {
      rma.status = 'Ordered';
      if (vendorDetails) rma.vendorDetails = { ...rma.vendorDetails, ...vendorDetails };
    }

    if (status === 'Dispatched') {
      rma.status = 'Dispatched';
      if (shippingDetails) rma.shippingDetails = { ...rma.shippingDetails, ...shippingDetails };
    }

    if (status === 'Received') {
      rma.status = 'Received';
      if (deliveredItemDestination) rma.deliveredItemDestination = deliveredItemDestination;
    }

    if (status === 'InRepair') {
      rma.status = 'InRepair';
      rma.repairDispatchDate = new Date();
      const faultyAsset = await Asset.findById(rma.originalAssetId);
      if (faultyAsset) {
        faultyAsset.status = 'In Repair';
        await faultyAsset.save();
      }
    }

    if (status === 'Repaired') {
      rma.status = 'Repaired';
      if (repairedItemDestination) rma.repairedItemDestination = repairedItemDestination;
    }

    if (status === 'TransferredToSiteStore') {
      rma.status = 'TransferredToSiteStore';
      rma.isFaultyItemFinalized = true;
      const asset = await Asset.findById(rma.originalAssetId);
      if (asset) {
        asset.status = 'Spare';
        asset.locationDescription = 'Site Storage / Spare';
        await asset.save();
      }
    }

    if (status === 'TransferredToHOStock') {
      rma.status = 'TransferredToHOStock';
      rma.isFaultyItemFinalized = true;
      const asset = await Asset.findById(rma.originalAssetId);
      const hoSite = await Site.findOne({ isHeadOffice: true });
      if (asset && hoSite) {
        asset.siteId = hoSite._id;
        asset.status = 'Spare';
        asset.locationDescription = 'HO Storage / Stock';
        await asset.save();
      }
    }

    if (status === 'Discarded') {
      rma.status = 'Discarded';
      rma.isFaultyItemFinalized = true;
      const asset = await Asset.findById(rma.originalAssetId);
      if (asset) {
        asset.status = 'Damaged';
        asset.isActive = false;
        await asset.save();
      }
    }

    // HO Stock transfer legacy statuses
    if (status === 'AwaitingStockTransfer') rma.status = 'AwaitingStockTransfer';
    if (status === 'StockInTransit') {
      rma.status = 'StockInTransit';
      if (rma.stockTransferId) {
        const transfer = await StockTransfer.findById(rma.stockTransferId);
        if (transfer) {
          transfer.status = 'InTransit';
          transfer.transferDate = new Date();
          await transfer.save();
          await Requisition.updateOne(
            { stockTransferId: transfer._id },
            { status: 'InTransit', dispatchedOn: new Date() }
          );
        }
      }
    }
    if (status === 'StockReceived') {
      rma.status = 'StockReceived';
      rma.installationStatus = 'Pending';
      if (rma.stockTransferId) {
        const transfer = await StockTransfer.findById(rma.stockTransferId);
        if (transfer) {
          transfer.status = 'Completed';
          transfer.receivedDate = new Date();
          transfer.receivedBy = req.user._id;
          await transfer.save();
          await Requisition.findOneAndUpdate(
            { stockTransferId: transfer._id },
            { status: 'Fulfilled', fulfilledOn: new Date(), receivedBy: req.user._id },
            { new: true }
          );
        }
      }
      if (rma.reservedAssetId) {
        const reservedAsset = await Asset.findById(rma.reservedAssetId);
        if (reservedAsset) {
          reservedAsset.siteId = rma.siteId;
          reservedAsset.status = 'Spare';
          reservedAsset.locationDescription = 'Received from HO - ready for installation';
          await reservedAsset.save();
        }
      }
    }

    if (status === 'RepairedItemEnRoute') {
      rma.status = 'RepairedItemEnRoute';
      rma.repairReceivedDate = new Date();
      if (shippingDetails) rma.shippingDetails = { ...rma.shippingDetails, ...shippingDetails };
    }
    if (status === 'RepairedItemReceived') {
      rma.status = 'RepairedItemReceived';
      rma.isFaultyItemFinalized = true;
      const ticket = await Ticket.findById(rma.ticketId);
      if (ticket) {
        ticket.rmaFinalized = true;
        if (rma.replacementSource === 'Repair') {
          ticket.rmaVerified = true;
        }
        await ticket.save();
      }
    }

    // Push timeline entry
    rma.timeline.push({
      status,
      changedBy: req.user._id,
      remarks: remarks || `Status updated to ${status}`
    });

    await rma.save();

    // Build status message for ticket activity
    const statusMessages = {
      'Approved': `**RMA Approved** by ${req.user.fullName}${rma.replacementStockSource ? `\n**Replacement Source:** ${rma.replacementStockSource}` : ''}${remarks ? `\n\nRemarks: ${remarks}` : ''}`,
      'Rejected': `**RMA Rejected** by ${req.user.fullName}${remarks ? `\n\nReason: ${remarks}` : ''}`,
      'SentToServiceCenter': `**Item Sent to Service Center** — L1 dispatched the faulty item directly to the service center for repair.${remarks ? `\nRemarks: ${remarks}` : ''}`,
      'SentToHO': `**Item Sent to Head Office** — The faulty item has been dispatched to HO.${rma.logisticsToHO?.trackingNumber ? `\nTracking: ${rma.logisticsToHO.trackingNumber}` : ''}${remarks ? `\nRemarks: ${remarks}` : ''}`,
      'ReceivedAtHO': `**Item Received at HO** — Admin (${req.user.fullName}) has acknowledged receipt of the item at Head Office.${remarks ? `\nRemarks: ${remarks}` : ''}`,
      'SentForRepairFromHO': `**Item Sent for Repair from HO** — Admin has forwarded the item from HO to the service center.${rma.logisticsToServiceCenter?.serviceCenterTicketRef ? `\nService Center Ref: ${rma.logisticsToServiceCenter.serviceCenterTicketRef}` : ''}${remarks ? `\nRemarks: ${remarks}` : ''}`,
      'ItemRepairedAtHO': `**Repaired Item Received at HO** — Admin (${req.user.fullName}) confirms the repaired item has been received at HO.${remarks ? `\nRemarks: ${remarks}` : ''}`,
      'ReturnShippedToSite': `**Item Shipped Back to Site** — Admin has dispatched the repaired item from HO to the site.${rma.logisticsReturnToSite?.trackingNumber ? `\nTracking: ${rma.logisticsReturnToSite.trackingNumber}` : ''}${remarks ? `\nRemarks: ${remarks}` : ''}`,
      'ReceivedAtSite': `**Item Received at Site** — The repaired item has been received at the site and is ready for installation.${remarks ? `\nRemarks: ${remarks}` : ''}`,
      'Installed': `**Device Installed** — The device has been installed and is operational.${remarks ? `\nRemarks: ${remarks}` : ''}`,
      // Replacement workflow messages
      'ReplacementRequisitionRaised': `**Replacement Requisition Raised** — Admin (${req.user.fullName}) has raised a requisition for stock replacement.\n**Source:** ${rma.replacementStockSource === 'HOStock' ? 'HO Stock' : rma.replacementStockSource === 'SiteStock' ? 'Site Stock' : 'Market Purchase'}${remarks ? `\nRemarks: ${remarks}` : ''}`,
      'ReplacementDispatched': `**Replacement Dispatched** — Replacement stock has been dispatched to the site.${rma.logisticsReplacementToSite?.trackingNumber ? `\nTracking: ${rma.logisticsReplacementToSite.trackingNumber}` : ''}${remarks ? `\nRemarks: ${remarks}` : ''}`,
      'ReplacementReceivedAtSite': `**Replacement Received at Site** — The replacement item has been received at the site and is ready for installation.${remarks ? `\nRemarks: ${remarks}` : ''}`,
    };

    const statusMessage = statusMessages[status] || `RMA Status Updated: ${status}${remarks ? `. ${remarks}` : ''}`;

    await TicketActivity.create({
      ticketId: rma.ticketId,
      userId: req.user._id,
      activityType: 'RMA',
      content: statusMessage
    });

    // Send email notifications for key milestones
    const notificationMilestones = ['Approved', 'SentToServiceCenter', 'SentToHO', 'ReceivedAtHO', 'ItemRepairedAtHO', 'ReturnShippedToSite', 'ReceivedAtSite', 'Installed', 'ReplacementRequisitionRaised', 'ReplacementDispatched', 'ReplacementReceivedAtSite'];
    if (notificationMilestones.includes(status)) {
      try {
        let recipients = [];
        const site = await Site.findById(rma.siteId);

        recipients = await User.find({
          $or: [
            { role: 'Admin' },
            { role: 'Supervisor', siteId: rma.siteId },
            { role: 'SiteManager', siteId: rma.siteId }
          ],
          isActive: true
        }).select('fullName email');

        if (recipients.length > 0) {
          await sendRMAMilestoneEmail(rma, status, recipients, {
            siteName: site?.siteName,
            shippingDetails,
            remarks
          });
        }
      } catch (emailError) {
        console.error('Error sending RMA milestone email:', emailError);
      }
    }

    res.json({ success: true, data: rma });

    // Fire-and-forget: log activity
    DailyWorkLog.logActivity(req.user._id, {
      category: 'RMAStatusChanged',
      description: `Changed RMA ${rma.rmaNumber} status from ${previousStatus} to ${status} (by ${req.user.fullName})`,
      refModel: 'RMARequest',
      refId: rma._id,
      metadata: { rmaNumber: rma.rmaNumber, status, previousStatus, approver: req.user.fullName }
    }).catch(() => { });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm Hardware Installation
// @route   PUT /api/rma/:id/confirm-installation
// @access  Private
export const confirmInstallation = async (req, res, next) => {
  try {
    const { status, remarks, newIpAddress, newUserName, newPassword, newSerialNumber, newMac, installTrack } = req.body;

    const rma = await RMARequest.findById(req.params.id);
    if (!rma) {
      return res.status(404).json({ success: false, message: 'RMA not found' });
    }

    rma.installationStatus = status || 'Installed & Working';
    rma.isInstallationConfirmed = true;
    rma.installedBy = req.user._id;
    rma.installedOn = new Date();

    // Update the relevant track status
    if (installTrack === 'replacement') {
      rma.replacementTrackStatus = 'Installed';
    } else {
      rma.repairTrackStatus = 'Installed';
    }

    // Check if both tracks are done
    const repairDone = ['Installed', 'CompletedToHOStock'].includes(rma.repairTrackStatus);
    const replacementDone = rma.replacementTrackStatus === 'NotRequired'
      || rma.replacementTrackStatus === 'Installed';
    if (repairDone && replacementDone) {
      rma.status = 'Installed';
      rma.isFaultyItemFinalized = true;
    }

    rma.timeline.push({
      status: `Installed (${installTrack === 'replacement' ? 'Replacement' : 'Repair'})`,
      changedBy: req.user._id,
      remarks: remarks || `Installation confirmed: ${status}`
    });

    // Update the asset details — assetCode is NEVER changed
    const asset = await Asset.findById(rma.originalAssetId);
    if (asset) {
      asset.status = 'Operational';
      // Update network/credential fields if provided
      if (newIpAddress) asset.ipAddress = newIpAddress;
      if (newUserName) asset.userName = newUserName;
      if (newPassword) asset.password = newPassword;
      // Update hardware identifiers if a new SN/MAC was provided (e.g., new board installed)
      if (newSerialNumber) asset.serialNumber = newSerialNumber;
      if (newMac) asset.mac = newMac;
      // assetCode remains unchanged — it is a fixed identifier
      await asset.save();

      rma.replacementDetails = {
        ...rma.replacementDetails,
        ipAddress: newIpAddress || asset.ipAddress,
        serialNumber: newSerialNumber || asset.serialNumber,
        mac: newMac || asset.mac
      };
    }

    if (rma.status === 'Installed') {
      rma.isFaultyItemFinalized = true;
    }
    await rma.save();

    // Update ticket — only finalize when both tracks are complete
    if (rma.status === 'Installed') {
      const ticket = await Ticket.findById(rma.ticketId);
      if (ticket) {
        ticket.status = 'Installed'; // Update ticket status to reflect installation
        ticket.rmaFinalized = true;
        ticket.rmaVerified = true;
        await ticket.save();
      }
    }

    // Log activity
    await TicketActivity.create({
      ticketId: rma.ticketId,
      userId: req.user._id,
      activityType: 'RMA',
      content: `**Device Installation Confirmed**\n\n**Status:** ${status}\n**IP Address:** ${newIpAddress || 'Not changed'}${remarks ? `\n**Remarks:** ${remarks}` : ''}`
    });

    res.json({ success: true, data: rma, message: 'Installation confirmed' });

    DailyWorkLog.logActivity(req.user._id, {
      category: 'RMAStatusChanged',
      description: `Installation confirmed for RMA ${rma.rmaNumber} (by ${req.user.fullName})`,
      refModel: 'RMARequest',
      refId: rma._id,
      metadata: { rmaNumber: rma.rmaNumber, installationStatus: status }
    }).catch(() => { });
  } catch (error) {
    next(error);
  }
};
