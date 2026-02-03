import RMARequest from '../models/RMARequest.model.js';
import Ticket from '../models/Ticket.model.js';
import Asset from '../models/Asset.model.js';
import TicketActivity from '../models/TicketActivity.model.js';
import User from '../models/User.model.js';
import Site from '../models/Site.model.js';
import StockTransfer from '../models/StockTransfer.model.js';
import Requisition from '../models/Requisition.model.js';
import StockMovementLog from '../models/StockMovementLog.model.js';
import { sendRMACreationEmail, sendRMAMilestoneEmail } from '../utils/email.utils.js';

// HO Stock auto-transfer threshold (if stock quantity > this, auto-approve transfer)
const HO_STOCK_AUTO_TRANSFER_THRESHOLD = 2;

// Helper function to perform asset swap for stock-based replacements
const performAssetSwap = async (rma, req) => {
  if (!rma.reservedAssetId) return;

  const originalAsset = await Asset.findById(rma.originalAssetId);
  const spareAsset = await Asset.findById(rma.reservedAssetId);

  if (!originalAsset || !spareAsset) return;

  // Store old details before swap
  const oldSerial = originalAsset.serialNumber;
  const oldMac = originalAsset.mac;

  // 1. Update Operational Asset with Spare's hardware identity
  originalAsset.serialNumber = spareAsset.serialNumber;
  originalAsset.mac = spareAsset.mac;
  // Keep IP and other details for engineer to update later if needed
  await originalAsset.save();

  spareAsset.serialNumber = oldSerial;
  spareAsset.mac = oldMac;
  spareAsset.status = rma.faultyItemAction === 'Repair' ? 'In Repair' : 'Maintenance'; // Mark appropriately
  spareAsset.reservedByRma = undefined;
  // If it's HO stock being used at a site, the spare actually stays 'site-less' or moves to site?
  // Usually the faulty hardware stays at the site until shipped.
  await spareAsset.save();

  // 3. Update RMA replacement details for tracking
  rma.replacementDetails = {
    ...rma.replacementDetails,
    serialNumber: originalAsset.serialNumber,
    mac: originalAsset.mac,
    model: spareAsset.model,
    make: spareAsset.make
  };
  await rma.save();

  return { oldSerial, newSerial: originalAsset.serialNumber };
};

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
    const ongoingStatuses = [
      'Requested', 'Approved', 'Ordered', 'Dispatched', 'Received', 'InRepair', 'Repaired',
      // HO Stock transfer statuses
      'AwaitingStockTransfer', 'StockInTransit', 'StockReceived',
      // Repair flow statuses
      'RepairedItemEnRoute', 'RepairedItemReceived'
    ];
    const completedStatuses = ['Installed', 'Rejected', 'TransferredToSiteStore', 'TransferredToHOStock', 'Discarded'];

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

    // Determine initial status based on replacement source and permissions
    let initialStatus = 'Requested';
    let isAutoTransfer = false;

    if (isDirectRMA) {
      if (replacementSource === 'SiteStock') {
        initialStatus = 'Approved'; // SiteStock swaps immediately
      } else if (replacementSource === 'HOStock') {
        // Check HO stock quantity for auto-transfer threshold
        const hoSite = await Site.findOne({ isHeadOffice: true });
        if (hoSite) {
          const hoStockCount = await Asset.countDocuments({
            siteId: hoSite._id,
            assetType: asset.assetType,
            status: 'Spare'
          });
          isAutoTransfer = hoStockCount > HO_STOCK_AUTO_TRANSFER_THRESHOLD;
          initialStatus = isAutoTransfer ? 'AwaitingStockTransfer' : 'Approved';
        }
      } else if (replacementSource === 'Repair') {
        initialStatus = 'InRepair'; // Repair flow goes directly to InRepair
      } else {
        initialStatus = 'Approved'; // Market source
      }
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
      approvedBy: isDirectRMA ? req.user._id : undefined,
      approvedOn: isDirectRMA ? new Date() : undefined,
      status: initialStatus,
      isSiteStockUsed: replacementSource === 'SiteStock',
      faultyItemAction: (replacementSource === 'SiteStock' || replacementSource === 'HOStock')
        ? faultyItemAction
        : (replacementSource === 'Repair' ? 'Repair' : 'None'),
      replacementSource,
      reservedAssetId: (replacementSource === 'HOStock' || replacementSource === 'SiteStock') ? reservedAssetId : undefined,
      isAutoTransfer,
      // Set default repaired item destination for Repair flow
      repairedItemDestination: replacementSource === 'Repair' ? 'BackToSite' : 'None',
      timeline: [{
        status: initialStatus,
        changedBy: req.user._id,
        remarks: isDirectRMA
          ? (replacementSource === 'Repair'
            ? 'Repair-only RMA created - faulty item sent for repair'
            : 'Directly created and approved')
          : requestReason
      }]
    });

    // Handle Asset logic based on replacement source
    if (isDirectRMA && replacementSource === 'SiteStock' && reservedAssetId) {
      // SITE STOCK FLOW: Immediate swap
      await performAssetSwap(rma, req);

      if (rma.faultyItemAction === 'Repair') {
        rma.status = 'InRepair';
        rma.timeline.push({
          status: 'InRepair',
          changedBy: req.user._id,
          remarks: 'Asset swapped from site stock and faulty item sent for repair'
        });
      }

      rma.isInstallationConfirmed = true;
      rma.installationStatus = 'Installed & Working';
      rma.installedBy = req.user._id;
      rma.installedOn = new Date();

      await rma.save();
    } else if (isDirectRMA && replacementSource === 'HOStock' && reservedAssetId) {
      // HO STOCK FLOW: Create stock transfer
      const hoSite = await Site.findOne({ isHeadOffice: true });
      if (hoSite) {
        // Reserve the asset
        const reservedAsset = await Asset.findById(reservedAssetId);
        if (reservedAsset) {
          reservedAsset.status = 'Reserved';
          reservedAsset.reservedByRma = rma._id;
          await reservedAsset.save();
        }

        // Create stock transfer from HO to Site
        const transfer = await StockTransfer.create({
          sourceSiteId: hoSite._id,
          destinationSiteId: siteIdValue,
          assetIds: [reservedAssetId],
          initiatedBy: req.user._id,
          approvedBy: isAutoTransfer ? req.user._id : undefined,
          status: isAutoTransfer ? 'Approved' : 'Pending',
          notes: `Auto-created for RMA ${rma.rmaNumber}. ${isAutoTransfer ? 'Auto-approved (threshold met)' : 'Awaiting manual approval'}`
        });

        // Create Requisition Order for tracking in Stock Management
        const requisition = await Requisition.create({
          ticketId: ticket._id,
          rmaId: rma._id,
          requisitionType: 'RMATransfer',
          transferDirection: 'ToSite',
          siteId: siteIdValue,
          sourceSiteId: hoSite._id,
          requestedBy: req.user._id,
          assetId: reservedAssetId,
          assetType: asset.assetType,
          quantity: 1,
          status: isAutoTransfer ? 'Approved' : 'Pending',
          approvedBy: isAutoTransfer ? req.user._id : undefined,
          approvedOn: isAutoTransfer ? new Date() : undefined,
          stockTransferId: transfer._id,
          comments: `RMA ${rma.rmaNumber} - HO stock transfer to site for replacement`
        });

        rma.stockTransferId = transfer._id;
        rma.timeline.push({
          status: 'AwaitingStockTransfer',
          changedBy: req.user._id,
          remarks: isAutoTransfer
            ? `Stock transfer auto-approved (HO stock > ${HO_STOCK_AUTO_TRANSFER_THRESHOLD} units). Transfer ID: ${transfer._id}. Requisition: ${requisition.requisitionNumber}`
            : `Stock transfer initiated from HO, awaiting approval. Transfer ID: ${transfer._id}. Requisition: ${requisition.requisitionNumber}`
        });

        await rma.save();
      }
    } else if (isDirectRMA && replacementSource === 'Repair') {
      // REPAIR FLOW: No replacement, just mark faulty item as In Repair
      const faultyAsset = await Asset.findById(asset._id);
      if (faultyAsset) {
        faultyAsset.status = 'In Repair';
        await faultyAsset.save();
      }

      rma.repairDispatchDate = new Date();
      rma.timeline.push({
        status: 'InRepair',
        changedBy: req.user._id,
        remarks: 'Faulty item sent to service center for repair. Will be returned to original site after repair.'
      });

      await rma.save();
    } else if ((replacementSource === 'HOStock' || replacementSource === 'SiteStock') && reservedAssetId) {
      // Just reserve it if not yet approved
      const reservedAsset = await Asset.findById(reservedAssetId);
      if (reservedAsset) {
        const fromStatus = reservedAsset.status;
        reservedAsset.status = 'Reserved';
        reservedAsset.reservedByRma = rma._id;
        await reservedAsset.save();

        // Log the reservation
        await StockMovementLog.logMovement({
          asset: reservedAsset,
          movementType: 'Reserved',
          fromSiteId: reservedAsset.siteId,
          toSiteId: reservedAsset.siteId,
          fromStatus: fromStatus,
          toStatus: 'Reserved',
          performedBy: req.user._id,
          rmaId: rma._id,
          ticketId: ticket._id,
          notes: `RMA ${rma.rmaNumber} - Asset reserved for replacement (pending approval)`
        });
      }
    }

    // Map RMA to Ticket for future reference
    ticket.rmaId = rma._id;
    ticket.rmaNumber = rma.rmaNumber;
    await ticket.save();

    // Populate RMA for email
    await rma.populate('originalAssetId', 'assetCode assetType serialNumber ipAddress');

    // Log activity on ticket with detailed information
    await TicketActivity.create({
      ticketId: ticket._id,
      userId: req.user._id,
      activityType: 'RMA',
      content: isDirectRMA
        ? `**RMA/Device Replacement Created Directly**\n\n**RMA Number:** ${rma.rmaNumber}\n**Reason:** ${requestReason}\n**Asset:** ${asset.assetCode || 'N/A'} (${asset.assetType || 'Device'})\n**Current S/N:** ${asset.serialNumber || 'N/A'}\n\n_Status: Approved - Ready for procurement_`
        : `**RMA/Device Replacement Request Submitted**\n\n**RMA Number:** ${rma.rmaNumber}\n**Reason:** ${requestReason}\n**Asset:** ${asset.assetCode || 'N/A'} (${asset.assetType || 'Device'})\n\n_Awaiting approval from Admin/Supervisor_`
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
    let {
      status,
      remarks,
      vendorDetails,
      shippingDetails,
      replacementDetails,
      deliveredItemDestination,
      repairedItemDestination,
      repairedItemDestinationSiteId
    } = req.body;
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
    if (deliveredItemDestination) rma.deliveredItemDestination = deliveredItemDestination;
    if (repairedItemDestination) rma.repairedItemDestination = repairedItemDestination;

    // Status Logic
    if (status === 'Approved') {
      rma.approvedBy = req.user._id;
      rma.approvedOn = new Date();

      // Perform swap ONLY for SiteStock (immediate availability)
      // HOStock should NOT swap on approval - swap happens after StockReceived
      if (rma.replacementSource === 'SiteStock') {
        const swapResult = await performAssetSwap(rma, req);
        if (swapResult) {
          remarks = (remarks || '') + `\n[System] Asset Hardware Swapped: ${swapResult.oldSerial} -> ${swapResult.newSerial}`;

          // If faulty item action is Repair, mark RMA as InRepair immediately
          if (rma.faultyItemAction === 'Repair') {
            status = 'InRepair'; // Override the status being set
            rma.status = 'InRepair';
          }

          // Mark installation as confirmed since hardware was swapped
          rma.isInstallationConfirmed = true;
          rma.installationStatus = 'Installed & Working';
          rma.installedBy = req.user._id;
          rma.installedOn = new Date();
        }
      }

      // Create Requisition Order for HOStock RMA if not already created
      if (rma.replacementSource === 'HOStock' && rma.reservedAssetId && !rma.stockTransferId) {
        const hoSite = await Site.findOne({ isHeadOffice: true });
        const ticket = await Ticket.findById(rma.ticketId);
        const asset = await Asset.findById(rma.originalAssetId);

        if (hoSite && ticket && asset) {
          // Create stock transfer from HO to Site
          const transfer = await StockTransfer.create({
            sourceSiteId: hoSite._id,
            destinationSiteId: rma.siteId,
            assetIds: [rma.reservedAssetId],
            initiatedBy: req.user._id,
            approvedBy: req.user._id,
            status: 'Approved',
            notes: `Created for RMA ${rma.rmaNumber} upon approval`
          });

          // Create Requisition Order for tracking in Stock Management
          const requisition = await Requisition.create({
            ticketId: ticket._id,
            rmaId: rma._id,
            requisitionType: 'RMATransfer',
            transferDirection: 'ToSite',
            siteId: rma.siteId,
            sourceSiteId: hoSite._id,
            requestedBy: rma.requestedBy,
            assetId: rma.reservedAssetId,
            assetType: asset.assetType,
            quantity: 1,
            status: 'Approved',
            approvedBy: req.user._id,
            approvedOn: new Date(),
            stockTransferId: transfer._id,
            comments: `RMA ${rma.rmaNumber} - HO stock transfer to site for replacement`
          });

          rma.stockTransferId = transfer._id;

          // Update RMA status to AwaitingStockTransfer for HOStock flow
          status = 'AwaitingStockTransfer';
          rma.status = 'AwaitingStockTransfer';

          remarks = (remarks || '') + `\n[System] Stock transfer and requisition created. Requisition: ${requisition.requisitionNumber}. Status changed to AwaitingStockTransfer.`;
        }
      }
    }

    if (status === 'Rejected') {
      // Release reserved asset if any
      if (rma.reservedAssetId) {
        const reservedAsset = await Asset.findById(rma.reservedAssetId);
        if (reservedAsset) {
          const fromStatus = reservedAsset.status;
          reservedAsset.status = 'Spare';
          reservedAsset.reservedByRma = undefined;
          await reservedAsset.save();

          // Log the release
          await StockMovementLog.logMovement({
            asset: reservedAsset,
            movementType: 'Released',
            fromSiteId: reservedAsset.siteId,
            toSiteId: reservedAsset.siteId,
            fromStatus: fromStatus,
            toStatus: 'Spare',
            performedBy: req.user._id,
            rmaId: rma._id,
            ticketId: rma.ticketId,
            notes: `RMA ${rma.rmaNumber} - Reservation released (RMA rejected)`
          });
        }
      }
    }

    // Branching Logic for Completion/Transfers
    let ticketStatusUpdate = null;

    const faultyAssetId = (rma.replacementSource === 'SiteStock' || rma.replacementSource === 'HOStock')
      ? rma.reservedAssetId
      : rma.originalAssetId;

    if (status === 'TransferredToSiteStore') {
      const asset = await Asset.findById(faultyAssetId);
      if (asset) {
        const fromStatus = asset.status;
        asset.status = 'Spare';
        asset.locationDescription = 'Site Storage / Spare';
        await asset.save();

        // Log the stock movement - added to site store
        await StockMovementLog.logMovement({
          asset,
          movementType: 'StatusChange',
          fromSiteId: asset.siteId,
          toSiteId: asset.siteId,
          fromStatus: fromStatus,
          toStatus: 'Spare',
          performedBy: req.user._id,
          rmaId: rma._id,
          ticketId: rma.ticketId,
          notes: `RMA ${rma.rmaNumber} - Item transferred to site storage as spare`
        });
      }
    }

    if (status === 'TransferredToHOStock') {
      const asset = await Asset.findById(faultyAssetId);
      if (asset) {
        // Find Head Office Site
        const hoSite = await Site.findOne({ isHeadOffice: true });
        if (hoSite) {
          const originalSiteId = asset.siteId;
          const fromStatus = asset.status;
          asset.siteId = hoSite._id;
          asset.status = 'Spare';
          asset.locationDescription = 'HO Storage / Stock';
          await asset.save();

          // Create Requisition Order for tracking repaired item transfer to HO
          const requisition = await Requisition.create({
            rmaId: rma._id,
            ticketId: rma.ticketId,
            requisitionType: 'RepairedItemTransfer',
            transferDirection: 'ToHO',
            siteId: hoSite._id, // destination
            sourceSiteId: originalSiteId, // source (original site)
            requestedBy: req.user._id,
            assetId: faultyAssetId,
            assetType: asset.assetType,
            quantity: 1,
            status: 'Fulfilled', // Already completed since asset is updated
            approvedBy: req.user._id,
            approvedOn: new Date(),
            fulfilledOn: new Date(),
            comments: `RMA ${rma.rmaNumber} - Repaired item transferred to HO stock`
          });

          // Log the stock movement - item moved to HO
          await StockMovementLog.logMovement({
            asset,
            movementType: 'Transfer',
            fromSiteId: originalSiteId,
            toSiteId: hoSite._id,
            fromStatus: fromStatus,
            toStatus: 'Spare',
            performedBy: req.user._id,
            rmaId: rma._id,
            requisitionId: requisition._id,
            ticketId: rma.ticketId,
            notes: `RMA ${rma.rmaNumber} - Repaired item transferred to HO stock`
          });
        }
      }
    }

    if (status === 'TransferredToOtherSite') {
      const asset = await Asset.findById(faultyAssetId);
      if (asset && repairedItemDestinationSiteId) {
        const originalSiteId = asset.siteId;
        const fromStatus = asset.status;
        asset.siteId = repairedItemDestinationSiteId;
        asset.status = 'Spare';
        asset.locationDescription = 'Transferred as Spare';

        const targetSite = await Site.findById(repairedItemDestinationSiteId);
        if (targetSite) {
          remarks = (remarks || '') + `\n[System] Asset transferred to site: ${targetSite.siteName}`;
        }
        await asset.save();

        // Create Requisition Order for tracking repaired item transfer to other site
        const requisition = await Requisition.create({
          rmaId: rma._id,
          ticketId: rma.ticketId,
          requisitionType: 'RepairedItemTransfer',
          transferDirection: 'SiteToSite',
          siteId: repairedItemDestinationSiteId, // destination
          sourceSiteId: originalSiteId, // source (original site)
          requestedBy: req.user._id,
          assetId: faultyAssetId,
          assetType: asset.assetType,
          quantity: 1,
          status: 'Fulfilled', // Already completed since asset is updated
          approvedBy: req.user._id,
          approvedOn: new Date(),
          fulfilledOn: new Date(),
          comments: `RMA ${rma.rmaNumber} - Repaired item transferred to ${targetSite?.siteName || 'other site'}`
        });

        // Log the stock movement - site to site transfer
        await StockMovementLog.logMovement({
          asset,
          movementType: 'Transfer',
          fromSiteId: originalSiteId,
          toSiteId: repairedItemDestinationSiteId,
          fromStatus: fromStatus,
          toStatus: 'Spare',
          performedBy: req.user._id,
          rmaId: rma._id,
          requisitionId: requisition._id,
          ticketId: rma.ticketId,
          notes: `RMA ${rma.rmaNumber} - Item transferred to ${targetSite?.siteName || 'other site'}`
        });
      }
    }

    if (status === 'Discarded') {
      const asset = await Asset.findById(faultyAssetId);
      if (asset) {
        const fromStatus = asset.status;
        asset.status = 'Damaged';
        asset.remark = remarks || 'Item discarded after RMA process';
        asset.isActive = false;
        await asset.save();

        // Log the disposal
        await StockMovementLog.logMovement({
          asset,
          movementType: 'Disposed',
          fromSiteId: asset.siteId,
          toSiteId: asset.siteId,
          fromStatus: fromStatus,
          toStatus: 'Damaged',
          performedBy: req.user._id,
          rmaId: rma._id,
          ticketId: rma.ticketId,
          notes: `RMA ${rma.rmaNumber} - Item discarded/disposed`
        });
      }
    }

    // FINALIZATION Logic - if faulty item is processed, mark ticket and RMA as finalized
    // For Repair-only flow, RepairedItemReceived is the final state
    // For other flows, finalization happens when faulty item is disposed
    const finalizationStatuses = ['TransferredToSiteStore', 'TransferredToHOStock', 'TransferredToOtherSite', 'Discarded', 'RepairedItemReceived'];

    if (finalizationStatuses.includes(status)) {
      rma.isFaultyItemFinalized = true;
      const ticket = await Ticket.findById(rma.ticketId);
      if (ticket) {
        ticket.rmaFinalized = true;

        // For repair-only flow, update ticket status to Installed when item is received back
        if (status === 'RepairedItemReceived' && rma.replacementSource === 'Repair') {
          ticket.rmaVerified = true; // Also mark as verified since item is back and can be re-installed
          ticketStatusUpdate = 'Installed'; // Ticket can now show as installed
        }

        // If installation was already confirmed as working, ensure rmaVerified is set
        if (rma.isInstallationConfirmed && rma.installationStatus === 'Installed & Working') {
          ticket.rmaVerified = true;
        }

        await ticket.save();
      }
    }

    if (status === 'Dispatched') {
      ticketStatusUpdate = 'SentToSite';
    }

    if (status === 'Repaired') {
      ticketStatusUpdate = 'Repaired';
    }

    if (status === 'Received') {
      ticketStatusUpdate = 'Replaced';
    }

    if (status === 'InRepair') {
      const asset = await Asset.findById(faultyAssetId);
      if (asset) {
        const fromStatus = asset.status;
        asset.status = 'In Repair';
        await asset.save();

        // Log the status change for repair
        await StockMovementLog.logMovement({
          asset,
          movementType: 'StatusChange',
          fromSiteId: asset.siteId,
          toSiteId: asset.siteId,
          fromStatus: fromStatus,
          toStatus: 'In Repair',
          performedBy: req.user._id,
          rmaId: rma._id,
          ticketId: rma.ticketId,
          notes: `RMA ${rma.rmaNumber} - Item sent for repair`
        });
      }
      rma.repairDispatchDate = new Date();
    }

    // HO STOCK TRANSFER FLOW - New statuses
    if (status === 'StockInTransit') {
      // Update the linked stock transfer if exists
      if (rma.stockTransferId) {
        const transfer = await StockTransfer.findById(rma.stockTransferId);
        if (transfer) {
          transfer.status = 'InTransit';
          transfer.transferDate = new Date();
          await transfer.save();

          // Also update the associated requisition status
          await Requisition.updateOne(
            { stockTransferId: transfer._id },
            { status: 'InTransit', dispatchedOn: new Date() }
          );
        }
      }
      // Update reserved asset status
      if (rma.reservedAssetId) {
        const reservedAsset = await Asset.findById(rma.reservedAssetId);
        if (reservedAsset) {
          reservedAsset.status = 'InTransit';
          await reservedAsset.save();
        }
      }
    }

    if (status === 'StockReceived') {
      // Update the linked stock transfer
      let requisition = null;
      if (rma.stockTransferId) {
        const transfer = await StockTransfer.findById(rma.stockTransferId);
        if (transfer) {
          transfer.status = 'Completed';
          transfer.receivedDate = new Date();
          transfer.receivedBy = req.user._id;
          await transfer.save();

          // Also update the associated requisition status to Fulfilled
          requisition = await Requisition.findOneAndUpdate(
            { stockTransferId: transfer._id },
            {
              status: 'Fulfilled',
              fulfilledOn: new Date(),
              receivedBy: req.user._id
            },
            { new: true }
          );
        }
      }
      // Update reserved asset - move to destination site as spare (ready for installation)
      if (rma.reservedAssetId) {
        const reservedAsset = await Asset.findById(rma.reservedAssetId);
        if (reservedAsset) {
          const fromSiteId = reservedAsset.siteId; // HO site
          const fromStatus = reservedAsset.status;

          reservedAsset.siteId = rma.siteId;
          reservedAsset.status = 'Spare'; // Available at site for swap
          reservedAsset.locationDescription = 'Received from HO - ready for installation';
          await reservedAsset.save();

          // Log the stock movement
          await StockMovementLog.logMovement({
            asset: reservedAsset,
            movementType: 'RMATransfer',
            fromSiteId: fromSiteId,
            toSiteId: rma.siteId,
            fromStatus: fromStatus,
            toStatus: 'Spare',
            performedBy: req.user._id,
            rmaId: rma._id,
            requisitionId: requisition?._id,
            stockTransferId: rma.stockTransferId,
            ticketId: rma.ticketId,
            notes: `RMA ${rma.rmaNumber} - Stock received at site from HO`
          });
        }
      }
      // Don't auto-install - wait for explicit installation confirmation
      // Set installation pending so user must confirm installation with credentials
      rma.installationStatus = 'Pending';
      ticketStatusUpdate = 'Replaced'; // Ticket status changes to Replaced (item received)
    }

    // REPAIR FLOW - New statuses
    if (status === 'RepairedItemEnRoute') {
      // Item has been repaired and is being shipped back
      rma.repairReceivedDate = new Date();
      if (shippingDetails) {
        rma.shippingDetails = { ...rma.shippingDetails, ...shippingDetails };
      }
    }

    if (status === 'RepairedItemReceived') {
      const asset = await Asset.findById(rma.originalAssetId);
      if (asset) {
        const fromStatus = asset.status;
        const fromSiteId = asset.siteId;
        let destinationSiteId = asset.siteId;
        let movementNotes = '';

        // Check override destination
        if (rma.repairedItemDestination === 'OtherSite' && rma.overrideDestinationSiteId) {
          destinationSiteId = rma.overrideDestinationSiteId;
          asset.siteId = rma.overrideDestinationSiteId;
          asset.status = 'Spare';
          asset.locationDescription = 'Repaired - transferred to another site';
          const targetSite = await Site.findById(rma.overrideDestinationSiteId);
          movementNotes = `RMA ${rma.rmaNumber} - Repaired item routed to ${targetSite?.siteName || 'other site'}`;
          remarks = (remarks || '') + `\n[System] Repaired item routed to ${targetSite?.siteName || 'other site'} (override approved by ${rma.overrideApprovedBy ? 'admin' : 'system'})`;
        } else if (rma.repairedItemDestination === 'HOStock') {
          const hoSite = await Site.findOne({ isHeadOffice: true });
          if (hoSite) {
            destinationSiteId = hoSite._id;
            asset.siteId = hoSite._id;
            asset.status = 'Spare';
            asset.locationDescription = 'Repaired - added to HO stock';
            movementNotes = `RMA ${rma.rmaNumber} - Repaired item added to HO stock`;
          }
        } else {
          // Default: BackToSite - ready for re-installation
          asset.status = 'Spare';
          asset.locationDescription = 'Repaired - ready for re-installation';
          movementNotes = `RMA ${rma.rmaNumber} - Repaired item returned to site for re-installation`;
        }
        await asset.save();

        // Log the stock movement for repaired item
        await StockMovementLog.logMovement({
          asset,
          movementType: 'RepairedReturn',
          fromSiteId: fromSiteId,
          toSiteId: destinationSiteId,
          fromStatus: fromStatus,
          toStatus: 'Spare',
          performedBy: req.user._id,
          rmaId: rma._id,
          ticketId: rma.ticketId,
          notes: movementNotes
        });
      }

      // For Repair-only RMAs, set installation pending status
      if (rma.replacementSource === 'Repair' && rma.repairedItemDestination === 'BackToSite') {
        rma.installationStatus = 'Pending';
      }
    }

    // Update Ticket status if needed (but don't regress to worse status)
    if (ticketStatusUpdate) {
      const ticket = await Ticket.findById(rma.ticketId);
      if (ticket) {
        // Don't regress ticket status if it's already in a better state
        const protectedStatuses = ['Installed', 'Resolved', 'Verified', 'Closed'];
        if (!protectedStatuses.includes(ticket.status)) {
          ticket.status = ticketStatusUpdate;
          await ticket.save();
        }
      }
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

      // 3. Update Ticket status to Installed
      const ticket = await Ticket.findById(rma.ticketId);
      if (ticket) {
        ticket.status = 'Installed';
        await ticket.save();
      }
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
      'Approved': '',
      'Rejected': '',
      'Ordered': '',
      'Dispatched': '',
      'Received': '',
      'Installed': '',
      'InRepair': '',
      'Repaired': '',
      'TransferredToSiteStore': '',
      'TransferredToHOStock': '',
      'TransferredToOtherSite': '',
      'Discarded': '',
      // New HO Stock transfer statuses
      'AwaitingStockTransfer': '',
      'StockInTransit': '',
      'StockReceived': '',
      // New Repair flow statuses
      'RepairedItemEnRoute': '',
      'RepairedItemReceived': ''
    };

    switch (status) {
      case 'Approved':
        statusMessage = `**RMA Request Approved**\n\nThe device replacement request has been approved and is ready for procurement.${remarks ? `\n\n**Remarks:** ${remarks}` : ''}`;
        break;
      case 'Rejected':
        statusMessage = `**RMA Request Rejected**\n\nThe device replacement request has been declined.${remarks ? `\n\n**Reason:** ${remarks}` : ''}`;
        break;
      case 'Ordered':
        statusMessage = `**Replacement Device Ordered**\n\nA replacement device has been ordered from the vendor.${vendorDetails?.vendorName ? `\n\n**Vendor:** ${vendorDetails.vendorName}` : ''}${vendorDetails?.orderId ? `\n**Order ID:** ${vendorDetails.orderId}` : ''}${remarks ? `\n**Remarks:** ${remarks}` : ''}`;
        break;
      case 'Dispatched':
        statusMessage = `**Replacement Device Dispatched**\n\nThe replacement device is on its way.${shippingDetails?.carrier ? `\n\n**Carrier:** ${shippingDetails.carrier}` : ''}${shippingDetails?.trackingNumber ? `\n**Tracking:** ${shippingDetails.trackingNumber}` : ''}${remarks ? `\n**Remarks:** ${remarks}` : ''}`;
        break;
      case 'Received':
        statusMessage = `**Replacement Device Received**\n\nThe replacement device has been received.${deliveredItemDestination ? `\n\n**Destination:** ${deliveredItemDestination}` : ''}${remarks ? `\n\n**Remarks:** ${remarks}` : ''}`;
        break;
      case 'Installed':
        statusMessage = `**Replacement Device Installed**\n\nThe device has been successfully installed.${replacementDetails?.serialNumber ? `\n\n**New S/N:** ${replacementDetails.serialNumber}` : ''}${replacementDetails?.ipAddress ? `\n**New IP:** ${replacementDetails.ipAddress}` : ''}${remarks ? `\n**Remarks:** ${remarks}` : ''}`;
        break;
      case 'InRepair':
        statusMessage = `**Item Sent for Repair**\n\nThe faulty item has been sent to the service center for repair.${remarks ? `\n\n**Remarks:** ${remarks}` : ''}`;
        break;
      case 'Repaired':
        statusMessage = `**Item Repaired Successfully**\n\nThe item has been repaired and is ready for redeployment.${repairedItemDestination ? `\n\n**Destination:** ${repairedItemDestination}` : ''}${remarks ? `\n\n**Remarks:** ${remarks}` : ''}`;
        break;
      case 'TransferredToSiteStore':
        statusMessage = `**Device Transferred to Site Store**\n\nThe device has been placed in the site's local storage as a spare.${remarks ? `\n\n**Remarks:** ${remarks}` : ''}`;
        break;
      case 'TransferredToHOStock':
        statusMessage = `**Device Transferred to HO Stock**\n\nThe device has been transferred to the Head Office central stock.${remarks ? `\n\n**Remarks:** ${remarks}` : ''}`;
        break;
      case 'TransferredToOtherSite':
        statusMessage = `**Device Transferred to Another Site**\n\nThe device has been transferred to another site's stock pool.${remarks ? `\n\n**Remarks:** ${remarks}` : ''}`;
        break;
      case 'Discarded':
        statusMessage = `**Device Discarded**\n\nThe faulty device has been marked as non-functional and discarded.${remarks ? `\n\n**Reason:** ${remarks}` : ''}`;
        break;
      // New HO Stock transfer statuses
      case 'AwaitingStockTransfer':
        statusMessage = `**Awaiting Stock Transfer from HO**\n\nA stock transfer has been initiated from the Head Office. The replacement item will be shipped to the site.${remarks ? `\n\n**Remarks:** ${remarks}` : ''}`;
        break;
      case 'StockInTransit':
        statusMessage = `**Stock In Transit**\n\nThe replacement item is being shipped from Head Office to the site.${shippingDetails?.trackingNumber ? `\n\n**Tracking:** ${shippingDetails.trackingNumber}` : ''}${remarks ? `\n**Remarks:** ${remarks}` : ''}`;
        break;
      case 'StockReceived':
        statusMessage = `**Stock Received & Installed**\n\nThe replacement item has been received from HO and the hardware has been swapped.${remarks ? `\n\n**Remarks:** ${remarks}` : ''}`;
        break;
      // New Repair flow statuses
      case 'RepairedItemEnRoute':
        statusMessage = `**Repaired Item En Route**\n\nThe repaired item is being shipped back to the site for re-installation.${shippingDetails?.trackingNumber ? `\n\n**Tracking:** ${shippingDetails.trackingNumber}` : ''}${remarks ? `\n**Remarks:** ${remarks}` : ''}`;
        break;
      case 'RepairedItemReceived':
        statusMessage = `**Repaired Item Received**\n\nThe repaired item has been received and is ready for re-installation.${rma.repairedItemDestination === 'OtherSite' ? `\n\n**Note:** Item was routed to a different site as per approved override.` : ''}${remarks ? `\n\n**Remarks:** ${remarks}` : ''}`;
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

    // Send role-based email notifications for key milestones
    const notificationMilestones = ['Dispatched', 'Received', 'Repaired', 'StockInTransit', 'StockReceived', 'RepairedItemEnRoute', 'RepairedItemReceived'];
    if (notificationMilestones.includes(status)) {
      try {
        // Determine recipients based on milestone type
        let recipients = [];
        const site = await Site.findById(rma.siteId);

        if (['Dispatched', 'Received', 'StockInTransit', 'StockReceived', 'RepairedItemEnRoute', 'RepairedItemReceived'].includes(status)) {
          // Site Manager gets notified for dispatch/receive events
          recipients = await User.find({
            $or: [
              { role: 'Supervisor', siteId: rma.siteId },
              { role: 'SiteManager', siteId: rma.siteId },
              { role: 'Admin' }
            ],
            isActive: true
          }).select('fullName email');
        }

        if (status === 'Repaired') {
          // HO Ops / Admins get notified when item is repaired
          recipients = await User.find({
            $or: [
              { role: 'Admin' },
              { role: 'Supervisor' }
            ],
            isActive: true
          }).select('fullName email');
        }

        if (recipients.length > 0) {
          await sendRMAMilestoneEmail(rma, status, recipients, {
            siteName: site?.siteName,
            shippingDetails,
            remarks
          });
        }
      } catch (emailError) {
        console.error('Error sending RMA milestone email:', emailError);
        // Don't fail the status update if email fails
      }
    }

    res.json({ success: true, data: rma });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm Hardware Installation
// @route   PUT /api/rma/:id/confirm-installation
// @access  Private
export const confirmInstallation = async (req, res, next) => {
  try {
    const { status, remarks, newIpAddress, newUserName, newPassword } = req.body;
    const rma = await RMARequest.findById(req.params.id);

    if (!rma) {
      return res.status(404).json({ success: false, message: 'RMA request not found' });
    }

    const ticket = await Ticket.findById(rma.ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Associated ticket not found' });
    }

    // Update RMA Confirmation Details
    rma.installationStatus = status;
    rma.isInstallationConfirmed = true;

    // Add to timeline
    rma.timeline.push({
      status: `Installation Confirmed: ${status}`,
      changedBy: req.user._id,
      remarks: remarks || `Installation confirmed as: ${status}`
    });

    await rma.save();

    // Logic based on confirmation status
    let statusMessage = '';
    let activityIcon = '';

    if (status === 'Installed & Working') {
      activityIcon = '';
      ticket.status = 'Installed';
      ticket.rmaVerified = true;

      // Perform the hardware swap if we have a reserved asset (HO Stock flow)
      if (rma.reservedAssetId && rma.replacementSource === 'HOStock') {
        const originalAsset = await Asset.findById(rma.originalAssetId);
        const spareAsset = await Asset.findById(rma.reservedAssetId);

        if (originalAsset && spareAsset) {
          // Store old details before swap
          const oldSerial = originalAsset.serialNumber;
          const oldMac = originalAsset.mac;
          const oldIp = originalAsset.ipAddress;

          // Swap: Update operational asset with spare's hardware identity
          originalAsset.serialNumber = spareAsset.serialNumber;
          originalAsset.mac = spareAsset.mac;
          originalAsset.status = 'Operational';

          // Apply new IP/credentials if provided, otherwise keep the original
          originalAsset.ipAddress = newIpAddress || originalAsset.ipAddress;
          if (newUserName) originalAsset.userName = newUserName;
          if (newPassword) originalAsset.password = newPassword;
          await originalAsset.save();

          // Update spare asset (now faulty) with old details
          spareAsset.serialNumber = oldSerial;
          spareAsset.mac = oldMac;
          spareAsset.ipAddress = oldIp; // Keep old IP for tracking
          spareAsset.status = rma.faultyItemAction === 'Repair' ? 'In Repair' : 'Maintenance';
          spareAsset.reservedByRma = undefined;
          await spareAsset.save();

          // Update RMA replacement details for tracking
          rma.replacementDetails = {
            serialNumber: originalAsset.serialNumber,
            mac: originalAsset.mac,
            ipAddress: originalAsset.ipAddress,
            userName: newUserName || rma.replacementDetails?.userName,
            password: newPassword ? '********' : rma.replacementDetails?.password,
            model: spareAsset.model,
            make: spareAsset.make
          };

          // Store faulty item reference
          rma.faultyAssetId = spareAsset._id;

          // If faulty item action is Repair, set status to InRepair
          if (rma.faultyItemAction === 'Repair') {
            rma.status = 'InRepair';
          }

          rma.installedBy = req.user._id;
          rma.installedOn = new Date();
          await rma.save();

          statusMessage = `**Installation Confirmed & Verified**\n\nHardware swap completed:\n• **Old S/N:** ${oldSerial}\n• **New S/N:** ${originalAsset.serialNumber}\n• **IP:** ${originalAsset.ipAddress}${newUserName ? `\n• **User:** ${newUserName}` : ''}\n\nThe ticket is now eligible for resolution.\n\n**Remarks:** ${remarks || 'None'}`;
        }
      } else {
        // Non-HO Stock flow (SiteStock, Market, Repair-only)
        const asset = await Asset.findById(rma.originalAssetId);
        if (asset) {
          asset.status = 'Operational';
          if (newIpAddress) asset.ipAddress = newIpAddress;
          if (newUserName) asset.userName = newUserName;
          if (newPassword) asset.password = newPassword;
          await asset.save();

          if (newIpAddress || newUserName || newPassword) {
            rma.replacementDetails = {
              ...rma.replacementDetails,
              ...(newIpAddress && { ipAddress: newIpAddress }),
              ...(newUserName && { userName: newUserName }),
              ...(newPassword && { password: '********' }),
            };
            await rma.save();
          }
        }
        statusMessage = `**Installation Confirmed & Verified**\n\nThe device has been confirmed as installed and fully working. The ticket is now eligible for resolution.${newIpAddress ? `\n**New IP:** ${newIpAddress}` : ''}${newUserName ? `\n**New User:** ${newUserName}` : ''}\n\n**Remarks:** ${remarks || 'None'}`;
      }
    } else if (status === 'Installed but Not Working') {
      activityIcon = '';
      ticket.status = 'Escalated';
      ticket.rmaVerified = false;
      statusMessage = `**Installation Failed**\n\nThe device was installed but is not working as expected. The ticket has been escalated for further investigation.\n\n**Issue Details:** ${remarks || 'No details provided'}`;
    } else {
      activityIcon = '';
      ticket.status = 'SentToSite';
      ticket.rmaVerified = false;
      statusMessage = `**Installation Postponed**\n\nThe device has not been installed yet.\n\n**Remarks:** ${remarks || 'None'}`;
    }

    await ticket.save();

    // Log activity on ticket
    await TicketActivity.create({
      ticketId: ticket._id,
      userId: req.user._id,
      activityType: 'RMA',
      content: statusMessage
    });

    res.json({
      success: true,
      data: rma,
      message: `Installation confirmation recorded as: ${status}`
    });
  } catch (error) {
    next(error);
  }
};
