import mongoose from 'mongoose';
import Asset from '../models/Asset.model.js';
import Site from '../models/Site.model.js';
import Requisition from '../models/Requisition.model.js';
import StockTransfer from '../models/StockTransfer.model.js';
import Ticket from '../models/Ticket.model.js';
import TicketActivity from '../models/TicketActivity.model.js';
import StockReplacement from '../models/StockReplacement.model.js';
import RMARequest from '../models/RMARequest.model.js';
import StockMovementLog from '../models/StockMovementLog.model.js';
import DailyWorkLog from '../models/DailyWorkLog.model.js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Helper: Check if user has a specific right for a site
const hasRightForSite = (user, rightName, siteId) => {
    if (['Admin', 'Supervisor'].includes(user.role)) return true;
    if (user.rights?.globalRights?.includes(rightName)) return true;
    if (!siteId) return false;
    return user.rights?.siteRights?.some(sr => {
        const srSiteId = (sr.site?._id || sr.site)?.toString();
        return srSiteId === siteId.toString() && sr.rights?.includes(rightName);
    }) || false;
};


// @desc    Get inventory summary (stock counts by asset type)
// @route   GET /api/stock/inventory
// @access  Private
export const getInventory = async (req, res, next) => {
    try {
        const { siteId, assetType, search } = req.query;
        const user = req.user;

        let matchQuery = { status: 'Spare' };

        // Site filter
        if (siteId) {
            matchQuery.siteId = new mongoose.Types.ObjectId(siteId);
        } else if (user.role !== 'Admin') {
            matchQuery.siteId = { $in: (user.assignedSites || []).map(s => new mongoose.Types.ObjectId(s)) };
        }

        if (assetType) {
            matchQuery.assetType = assetType;
        }

        if (search) {
            matchQuery.$or = [
                { assetCode: { $regex: search, $options: 'i' } },
                { mac: { $regex: search, $options: 'i' } },
                { serialNumber: { $regex: search, $options: 'i' } }
            ];
        }

        // Aggregate by site and asset type
        let inventory = await Asset.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: { siteId: '$siteId', assetType: '$assetType' },
                    count: { $sum: { $ifNull: ['$quantity', 1] } },
                    assets: {
                        $push: {
                            _id: '$_id',
                            mac: '$mac',
                            assetType: '$assetType',
                            deviceType: '$deviceType',
                            make: '$make',
                            model: '$model',
                            serialNumber: '$serialNumber',
                            stockLocation: '$stockLocation',
                            quantity: '$quantity',
                            unit: '$unit',
                            remarks: '$remarks'
                        }
                    }
                }
            },

            {
                $lookup: {
                    from: 'sites',
                    localField: '_id.siteId',
                    foreignField: '_id',
                    as: 'site'
                }
            },
            { $unwind: '$site' },
            {
                $project: {
                    siteId: '$_id.siteId',
                    siteName: '$site.siteName',
                    isHeadOffice: '$site.isHeadOffice',
                    assetType: '$_id.assetType',
                    count: 1,
                    assets: 1
                }
            },
            { $sort: { 'isHeadOffice': -1, 'siteName': 1, 'assetType': 1 } }
        ]);

        // Decrypt sensitive fields for authorized users
        if (['Admin', 'Supervisor'].includes(user.role)) {
            inventory = inventory.map(group => ({
                ...group,
                assets: group.assets.map(asset => Asset.decryptSensitiveFields(asset))
            }));
        }

        res.json({
            success: true,
            data: inventory
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get stock availability for a ticket
// @route   GET /api/stock/availability/:ticketId
// @access  Private
export const getStockAvailability = async (req, res, next) => {
    try {
        const { ticketId } = req.params;
        const user = req.user;

        const ticket = await Ticket.findById(ticketId).populate('assetId', 'assetType deviceType');
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        const assetType = ticket.assetId?.assetType;
        const deviceType = ticket.assetId?.deviceType;
        if (!assetType) {
            return res.json({
                success: true,
                data: { localStock: 0, hoStock: 0, assetType: null, deviceType: null, allSitesStock: [] }
            });
        }

        // Build base filter: match assetType and deviceType (if available) for specificity
        const baseFilter = { assetType, status: 'Spare' };
        if (deviceType) {
            baseFilter.deviceType = deviceType;
        }

        const isAdminOrSupervisor = ['Admin', 'Supervisor'].includes(user.role);

        // Get Head Office site
        const hoSite = await Site.findOne({ isHeadOffice: true });

        if (isAdminOrSupervisor) {
            // ADMIN/SUPERVISOR: See stock from ALL sites with per-site breakdown
            const allSites = await Site.find({ isActive: true }).select('siteName isHeadOffice').lean();

            // Get all spares matching the asset/device type across all sites
            const allSpares = await Asset.find(baseFilter)
                .select('assetCode mac serialNumber make model stockLocation siteId deviceType')
                .lean();

            // Group by siteId
            const siteMap = {};
            for (const site of allSites) {
                siteMap[site._id.toString()] = {
                    siteId: site._id,
                    siteName: site.siteName,
                    isHeadOffice: site.isHeadOffice || false,
                    isTicketSite: site._id.toString() === ticket.siteId?.toString(),
                    count: 0,
                    spares: []
                };
            }

            for (const spare of allSpares) {
                const sid = spare.siteId?.toString();
                if (siteMap[sid]) {
                    siteMap[sid].count++;
                    siteMap[sid].spares.push(spare);
                }
            }

            // Convert to array and sort: ticket site first, then HO, then others
            const allSitesStock = Object.values(siteMap)
                .filter(s => s.count > 0)
                .sort((a, b) => {
                    if (a.isTicketSite && !b.isTicketSite) return -1;
                    if (!a.isTicketSite && b.isTicketSite) return 1;
                    if (a.isHeadOffice && !b.isHeadOffice) return -1;
                    if (!a.isHeadOffice && b.isHeadOffice) return 1;
                    return a.siteName.localeCompare(b.siteName);
                });

            // Also compute local and HO for backward compatibility
            const localSpares = allSpares.filter(s => s.siteId?.toString() === ticket.siteId?.toString());
            const hoSpares = hoSite ? allSpares.filter(s => s.siteId?.toString() === hoSite._id.toString() && s.siteId?.toString() !== ticket.siteId?.toString()) : [];

            // Decrypt sensitive fields for all spares
            const decryptSpares = (spares) => spares.map(s => Asset.decryptSensitiveFields(s));

            // Apply decryption to grouped stock
            allSitesStock.forEach(site => {
                if (site.spares) {
                    site.spares = decryptSpares(site.spares);
                }
            });

            res.json({
                success: true,
                data: {
                    assetType,
                    deviceType: deviceType || null,
                    localStock: localSpares.length,
                    hoStock: hoSpares.length,
                    localSpares: decryptSpares(localSpares),
                    hoSpares: decryptSpares(hoSpares),
                    hoSiteId: hoSite?._id,
                    allSitesStock,
                    totalAvailable: allSpares.length,
                    viewScope: 'all'
                }
            });
        } else {
            // ENGINEER: See only stock from the ticket's site
            let localSpares = await Asset.find({
                ...baseFilter,
                siteId: ticket.siteId
            }).select('assetCode mac serialNumber make model stockLocation deviceType');

            // Decrypt local spares
            localSpares = localSpares.map(s => Asset.decryptSensitiveFields(s));

            res.json({
                success: true,
                data: {
                    assetType,
                    deviceType: deviceType || null,
                    localStock: localSpares.length,
                    hoStock: 0,
                    localSpares,
                    hoSpares: [],
                    hoSiteId: null,
                    allSitesStock: [],
                    totalAvailable: localSpares.length,
                    viewScope: 'site'
                }
            });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Create a requisition request
// @route   POST /api/stock/requisitions
// @access  Private
export const createRequisition = async (req, res, next) => {
    try {
        const { ticketId, sourceSiteId, assetType, quantity = 1, comments } = req.body;
        const user = req.user;

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        // Verify stock availability
        const availableStock = await Asset.countDocuments({
            siteId: sourceSiteId,
            assetType: assetType,
            status: 'Spare'
        });

        if (availableStock < quantity) {
            return res.status(400).json({
                success: false,
                message: `Insufficient stock. Only ${availableStock} available.`
            });
        }

        const requisition = await Requisition.create({
            ticketId,
            siteId: ticket.siteId,
            sourceSiteId,
            requestedBy: user._id,
            assetType,
            quantity,
            comments,
            status: 'Pending'
        });

        // Log activity
        await TicketActivity.create({
            ticketId,
            userId: user._id,
            activityType: 'RequisitionCreated',
            description: `Requisition created for ${quantity} ${assetType}`,
            metadata: { requisitionId: requisition._id }
        });

        res.status(201).json({
            success: true,
            data: requisition,
            message: 'Requisition created successfully'
        });

        // Fire-and-forget: log activity
        DailyWorkLog.logActivity(user._id, {
            category: 'RequisitionCreated',
            description: `Created requisition for ${quantity} ${assetType}`,
            refModel: 'Requisition',
            refId: requisition._id,
            metadata: { quantity, assetType, ticketId }
        }).catch(() => { });
    } catch (error) {
        next(error);
    }
};

// @desc    Get requisitions
// @route   GET /api/stock/requisitions
// @access  Private
export const getRequisitions = async (req, res, next) => {
    try {
        const { status, siteId, ticketId, requisitionType, page = 1, limit = 20 } = req.query;
        const user = req.user;

        let query = {};

        if (status) query.status = status;
        if (ticketId) query.ticketId = ticketId;
        if (siteId) query.siteId = siteId;
        if (requisitionType) query.requisitionType = requisitionType;

        // Non-admins see only their sites
        if (user.role !== 'Admin') {
            query.$or = [
                { siteId: { $in: user.assignedSites || [] } },
                { sourceSiteId: { $in: user.assignedSites || [] } },
                { requestedBy: user._id }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [requisitions, total] = await Promise.all([
            Requisition.find(query)
                .populate('ticketId', 'ticketNumber title')
                .populate('rmaId', 'rmaNumber status replacementSource')
                .populate('siteId', 'siteName isHeadOffice')
                .populate('sourceSiteId', 'siteName isHeadOffice')
                .populate('requestedBy', 'fullName')
                .populate('approvedBy', 'fullName')
                .populate('assetId', 'assetCode assetType serialNumber')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Requisition.countDocuments(query)
        ]);

        // Get counts by type for dashboard
        const typeCounts = await Requisition.aggregate([
            { $match: user.role === 'Admin' ? {} : query },
            { $group: { _id: '$requisitionType', count: { $sum: 1 } } }
        ]);

        res.json({
            success: true,
            data: requisitions,
            typeCounts: typeCounts.reduce((acc, tc) => {
                acc[tc._id || 'StockRequest'] = tc.count;
                return acc;
            }, {}),
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

// @desc    Approve a requisition
// @route   PUT /api/stock/requisitions/:id/approve
// @access  Private (Admin/Manager)
export const approveRequisition = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const requisition = await Requisition.findById(id);
        if (!requisition) {
            return res.status(404).json({ success: false, message: 'Requisition not found' });
        }

        if (requisition.status !== 'Pending') {
            return res.status(400).json({ success: false, message: 'Requisition is not pending' });
        }

        requisition.status = 'Approved';
        requisition.approvedBy = user._id;
        requisition.approvedOn = new Date();
        await requisition.save();

        res.json({
            success: true,
            data: requisition,
            message: 'Requisition approved'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Fulfill a requisition (assign asset)
// @route   PUT /api/stock/requisitions/:id/fulfill
// @access  Private
export const fulfillRequisition = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { assetId } = req.body;
        const user = req.user;

        const requisition = await Requisition.findById(id);
        if (!requisition) {
            return res.status(404).json({ success: false, message: 'Requisition not found' });
        }

        if (requisition.status !== 'Approved' && requisition.status !== 'Pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot fulfill requisition with status: ${requisition.status}`
            });
        }

        const asset = await Asset.findById(assetId);
        if (!asset || asset.status !== 'Spare') {
            return res.status(400).json({
                success: false,
                message: 'Asset is not available (must be Spare status)'
            });
        }

        // Update asset status and site
        asset.status = 'Operational';
        asset.siteId = requisition.siteId;
        asset.stockLocation = null;
        await asset.save();

        // Mark old ticket asset as damaged (if exists)
        const ticket = await Ticket.findById(requisition.ticketId);
        if (ticket && ticket.assetId) {
            await Asset.findByIdAndUpdate(ticket.assetId, { status: 'Damaged' });
        }

        // Update ticket with new asset
        if (ticket) {
            ticket.assetId = asset._id;
            await ticket.save();
        }

        // Update requisition
        requisition.status = 'Fulfilled';
        requisition.fulfilledAssetId = asset._id;
        requisition.fulfilledOn = new Date();
        if (!requisition.approvedBy) {
            requisition.approvedBy = user._id;
            requisition.approvedOn = new Date();
        }
        await requisition.save();

        // Log activity
        await TicketActivity.create({
            ticketId: requisition.ticketId,
            userId: user._id,
            activityType: 'RequisitionFulfilled',
            description: `Requisition fulfilled with asset ${asset.assetCode}`,
            metadata: { requisitionId: requisition._id, assetId: asset._id }
        });

        res.json({
            success: true,
            data: requisition,
            message: 'Requisition fulfilled successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Reject a requisition
// @route   PUT /api/stock/requisitions/:id/reject
// @access  Private (Admin/Manager)
export const rejectRequisition = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const user = req.user;

        const requisition = await Requisition.findById(id);
        if (!requisition) {
            return res.status(404).json({ success: false, message: 'Requisition not found' });
        }

        requisition.status = 'Rejected';
        requisition.rejectionReason = reason;
        requisition.approvedBy = user._id;
        requisition.approvedOn = new Date();
        await requisition.save();

        res.json({
            success: true,
            data: requisition,
            message: 'Requisition rejected'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add new stock (create spare assets)
// @route   POST /api/stock/add
// @access  Private (Admin or users with MANAGE_SITE_STOCK right for the site)
export const addStock = async (req, res, next) => {
    try {
        const {
            siteId, assetType, stockLocation, make, model,
            deviceType, serialNumber,
            quantity, unit, remarks, remark
        } = req.body;
        const user = req.user;

        const site = await Site.findById(siteId);
        if (!site) {
            return res.status(404).json({ success: false, message: 'Site not found' });
        }

        // Permission check: Non-admin/supervisor users must have MANAGE_SITE_STOCK right for this specific site
        const isAdminOrSupervisor = ['Admin', 'Supervisor'].includes(user.role);
        if (!isAdminOrSupervisor) {
            const hasGlobalRight = user.rights?.globalRights?.includes('MANAGE_SITE_STOCK');
            const hasSiteRight = user.rights?.siteRights?.some(sr => {
                const srSiteId = (sr.site?._id || sr.site)?.toString();
                return srSiteId === siteId.toString() && sr.rights?.includes('MANAGE_SITE_STOCK');
            });
            if (!hasGlobalRight && !hasSiteRight) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to add stock to this site'
                });
            }
        }

        // Auto-generate assetCode for stock items (not user-facing)
        const finalAssetCode = `SPR-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const asset = await Asset.create({
            assetCode: finalAssetCode,
            mac: req.body.mac || '',
            serialNumber,
            assetType,
            siteId,
            status: 'Spare',
            stockLocation,
            make,
            model,
            deviceType,
            quantity: quantity || 1,
            unit: unit || 'Nos',
            remarks: remarks || remark || '',
            remark: remarks || remark || '', // For backward compatibility
            criticality: 2 // Default criticality for spares
        });

        // Log the stock addition
        await StockMovementLog.logMovement({
            asset,
            movementType: 'Added',
            toSiteId: siteId,
            toStatus: 'Spare',
            performedBy: req.user._id,
            notes: `New stock added to ${site.siteName}${site.isHeadOffice ? ' (HO)' : ''} - ${stockLocation || 'No location specified'}`
        });

        res.status(201).json({
            success: true,
            data: asset,
            message: `Spare ${assetType} (${asset.assetCode}) added to stock`
        });

        // Fire-and-forget: log activity
        DailyWorkLog.logActivity(user._id, {
            category: 'StockAdded',
            description: `Added ${assetType} (${asset.assetCode}) to stock at ${site.siteName}`,
            refModel: 'Asset',
            refId: asset._id,
            metadata: { assetCode: asset.assetCode, siteId: site._id }
        }).catch(() => { });
    } catch (error) {
        next(error);
    }
};

// @desc    Get stock transfers
// @route   GET /api/stock/transfers
// @access  Private
export const getTransfers = async (req, res, next) => {
    try {
        const { status, siteId, page = 1, limit = 20 } = req.query;
        const user = req.user;

        let query = {};

        if (status) query.status = status;
        if (siteId) {
            query.$or = [
                { sourceSiteId: siteId },
                { destinationSiteId: siteId }
            ];
        }

        // Non-admins see only transfers involving their sites
        if (user.role !== 'Admin') {
            const userSites = user.assignedSites || [];
            query.$or = [
                { sourceSiteId: { $in: userSites } },
                { destinationSiteId: { $in: userSites } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [transfers, total] = await Promise.all([
            StockTransfer.find(query)
                .populate('sourceSiteId', 'siteName isHeadOffice')
                .populate('destinationSiteId', 'siteName isHeadOffice')
                .populate('initiatedBy', 'fullName')
                .populate('approvedBy', 'fullName')
                .populate('assetIds', 'assetCode assetType deviceType make model')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            StockTransfer.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: transfers,
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

// @desc    Initiate a stock transfer
// @route   POST /api/stock/transfers
// @access  Private (Admin)
export const initiateTransfer = async (req, res, next) => {
    try {
        const { sourceSiteId, destinationSiteId, assetIds, notes, transferName } = req.body;
        const user = req.user;

        // Validate assets are spare and belong to source site
        const assets = await Asset.find({
            _id: { $in: assetIds },
            siteId: sourceSiteId,
            status: 'Spare'
        });

        if (assets.length !== assetIds.length) {
            return res.status(400).json({
                success: false,
                message: 'Some assets are not available for transfer'
            });
        }

        // Auto-generate transfer name if not provided
        let finalTransferName = transferName;
        if (!finalTransferName) {
            const [srcSite, destSite] = await Promise.all([
                Site.findById(sourceSiteId).select('siteName isHeadOffice'),
                Site.findById(destinationSiteId).select('siteName isHeadOffice')
            ]);
            const srcLabel = srcSite?.isHeadOffice ? 'HO' : (srcSite?.siteName || 'Unknown');
            const destLabel = destSite?.isHeadOffice ? 'HO' : (destSite?.siteName || 'Unknown');
            finalTransferName = `${srcLabel} → ${destLabel}`;
        }

        const transfer = await StockTransfer.create({
            transferName: finalTransferName,
            sourceSiteId,
            destinationSiteId,
            assetIds,
            initiatedBy: user._id,
            notes,
            status: 'Pending'
        });

        res.status(201).json({
            success: true,
            data: transfer,
            message: 'Transfer initiated'
        });

        // Fire-and-forget: log activity
        DailyWorkLog.logActivity(user._id, {
            category: 'StockTransferred',
            description: `Initiated stock transfer: ${finalTransferName}`,
            refModel: 'StockTransfer',
            refId: transfer._id,
            metadata: { sourceSiteId, destinationSiteId, assetCount: assetIds.length }
        }).catch(() => { });
    } catch (error) {
        next(error);
    }
};

// @desc    Approve and dispatch a transfer
// @route   PUT /api/stock/transfers/:id/dispatch
// @access  Private (Admin)
export const dispatchTransfer = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { carrier, trackingNumber, courierName, remarks } = req.body;
        const user = req.user;

        const transfer = await StockTransfer.findById(id);
        if (!transfer) {
            return res.status(404).json({ success: false, message: 'Transfer not found' });
        }

        if (transfer.status !== 'Pending' && transfer.status !== 'Approved') {
            return res.status(400).json({ success: false, message: 'Transfer cannot be dispatched' });
        }

        // Update assets to InTransit
        await Asset.updateMany(
            { _id: { $in: transfer.assetIds } },
            { status: 'InTransit' }
        );

        transfer.status = 'Dispatched';
        transfer.approvedBy = user._id;
        transfer.transferDate = new Date();
        transfer.shippingDetails = {
            carrier: carrier || '',
            trackingNumber: trackingNumber || '',
            courierName: courierName || '',
            remarks: remarks || '',
            dispatchDate: new Date()
        };
        await transfer.save();

        res.json({
            success: true,
            data: transfer,
            message: 'Transfer dispatched'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Receive a transfer
// @route   PUT /api/stock/transfers/:id/receive
// @access  Private
export const receiveTransfer = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const transfer = await StockTransfer.findById(id);
        if (!transfer) {
            return res.status(404).json({ success: false, message: 'Transfer not found' });
        }

        if (transfer.status !== 'InTransit' && transfer.status !== 'Dispatched') {
            return res.status(400).json({ success: false, message: 'Transfer is not in transit / dispatched' });
        }

        // Update assets to Spare at destination
        await Asset.updateMany(
            { _id: { $in: transfer.assetIds } },
            { status: 'Spare', siteId: transfer.destinationSiteId }
        );

        transfer.status = 'Completed';
        transfer.receivedDate = new Date();
        transfer.receivedBy = user._id;
        await transfer.save();

        res.json({
            success: true,
            data: transfer,
            message: 'Transfer received'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get dispatched stock transfers for a destination site (for RMA dropdown)
// @route   GET /api/stock/transfers/dispatched-for-site/:siteId
// @access  Private
export const getDispatchedTransfersForSite = async (req, res, next) => {
    try {
        const { siteId } = req.params;

        // Find transfers that are dispatched / in-transit and heading to this site
        const transfers = await StockTransfer.find({
            destinationSiteId: siteId,
            status: { $in: ['Dispatched', 'InTransit'] }
        })
            .populate('sourceSiteId', 'siteName isHeadOffice')
            .populate('destinationSiteId', 'siteName isHeadOffice')
            .populate('assetIds', 'assetCode assetType deviceType make model')
            .populate('initiatedBy', 'fullName')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: transfers
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Bulk upload stock from Excel/CSV
// @route   POST /api/stock/bulk-upload
// @access  Private (Admin)
export const bulkUpload = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload a file' });
        }

        const filePath = req.file.path;
        let workbook;

        try {
            if (req.file.buffer) {
                // Memory storage (Vercel)
                workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
            } else {
                // Disk storage - use readFileSync for better reliability on Windows
                const absolutePath = path.resolve(filePath);
                if (!fs.existsSync(absolutePath)) {
                    throw new Error(`Upload failed: File not found at ${absolutePath}`);
                }
                const fileBuffer = fs.readFileSync(absolutePath);
                workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            }
        } catch (readError) {
            console.error('Excel Read Error:', readError);
            return res.status(400).json({
                success: false,
                message: 'Failed to read the uploaded file. Ensure it is a valid Excel or CSV file.',
                error: readError.message
            });
        }

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        if (data.length === 0) {
            return res.status(400).json({ success: false, message: 'The uploaded file is empty' });
        }

        const sites = await Site.find({ isActive: true });
        const siteMap = new Map();
        sites.forEach(s => {
            siteMap.set(s.siteName.toLowerCase(), s._id);
        });

        const results = {
            successCount: 0,
            failCount: 0,
            errors: []
        };

        const batchSize = 50;
        const assetsToCreate = [];

        const normalizeKey = key => key ? key.toString().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
        const toString = (val) => (val === null || val === undefined || val === '') ? undefined : String(val).trim();

        for (let i = 0; i < data.length; i++) {
            const rawRow = data[i];
            const rowNum = i + 2; // +1 for 0-index, +1 for header row

            let row = {};
            try {
                // Normalize keys for this row
                Object.keys(rawRow).forEach(key => {
                    row[normalizeKey(key)] = rawRow[key];
                });

                // Extract values using normalized keys
                const macAddress = toString(row['macaddress']) || toString(row['mac']);
                const assetType = toString(row['assettype']) || toString(row['devicetype']);
                const siteName = toString(row['sitename']) || toString(row['site']);
                const serialNumber = toString(row['serialnumber']) || toString(row['serialno']);
                const make = toString(row['make']) || toString(row['brand']);
                const model = toString(row['model']);
                const deviceType = toString(row['devicetype']) || toString(row['modeltype']);
                const stockLocation = toString(row['stocklocation']) || toString(row['location']);
                const quantityVal = toString(row['quantity']);
                const unit = toString(row['unit']) || 'Nos';
                const remarks = toString(row['remarks']) || toString(row['remark']);

                // Handle quantity: if number, use it; if NA, ignore entry; if empty, default to 1
                let quantity = 1;
                if (quantityVal) {
                    if (quantityVal.toUpperCase() === 'NA') {
                        throw new Error(`Row ${rowNum} ignored because Quantity is "NA"`);
                    }
                    const parsed = parseInt(quantityVal);
                    if (!isNaN(parsed)) {
                        quantity = parsed;
                    }
                }

                // Validation — only assetType and siteName are mandatory
                if (!assetType || !siteName) {
                    throw new Error(`Mandatory fields missing for row ${rowNum} (Need Asset Type and Site Name)`);
                }

                const targetSiteId = siteName ? siteMap.get(siteName.toLowerCase()) : null;
                if (!targetSiteId) {
                    throw new Error(`Site "${siteName || 'Unknown'}" not found or inactive`);
                }

                // Auto-generate assetCode for stock items (not user-facing)
                const finalAssetCode = `SPR-${Date.now()}-${rowNum}`;

                // Check for uniqueness if Serial Number is not "NA"
                const isSerialNA = !serialNumber || serialNumber.toUpperCase() === 'NA' || serialNumber.toUpperCase() === 'N/A';
                if (!isSerialNA) {
                    // Check database for Serial Number
                    const existingSerial = await Asset.findOne({ serialNumber: serialNumber });
                    if (existingSerial) {
                        throw new Error(`Serial Number "${serialNumber}" already exists in the database`);
                    }
                    // Check current batch for Serial Number
                    if (assetsToCreate.find(a => a.serialNumber === serialNumber)) {
                        throw new Error(`Duplicate Serial Number "${serialNumber}" found in the upload file`);
                    }
                }

                const isMacNA = !macAddress || macAddress.toUpperCase() === 'NA' || macAddress.toUpperCase() === 'N/A';

                const newAsset = {
                    assetCode: finalAssetCode,
                    mac: isMacNA ? '' : macAddress,
                    assetType,
                    siteId: targetSiteId,
                    serialNumber: serialNumber || '',
                    make: make || '',
                    model: model || '',
                    deviceType: deviceType || '',
                    stockLocation: stockLocation || '',
                    quantity,
                    unit,
                    remarks: remarks || '',
                    remark: remarks || '', // Keep for backward compatibility
                    status: 'Spare',
                    criticality: 2
                };

                assetsToCreate.push(newAsset);
                results.successCount++;

                // Process in batches
                if (assetsToCreate.length >= batchSize) {
                    await Asset.insertMany(assetsToCreate, { ordered: false });
                    assetsToCreate.length = 0;
                }
            } catch (error) {
                results.failCount++;
                results.errors.push({
                    row: rowNum,
                    assetCode: row['assetcode'] || row['assetid'] || row['macaddress'] || row['mac'] || 'Unknown',
                    message: error.message
                });
            }
        }

        // Final batch
        if (assetsToCreate.length > 0) {
            await Asset.insertMany(assetsToCreate, { ordered: false });
        }

        // Cleanup file if not on memory storage
        if (!req.file.buffer && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.status(200).json({
            success: results.failCount === 0,
            ...results,
            message: `Processed ${data.length} rows. ${results.successCount} imported, ${results.failCount} failed.`
        });

    } catch (error) {
        // Cleanup file on crash
        if (req.file && !req.file.buffer && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        next(error);
    }
};

// @desc    Export stock import template
// @route   GET /api/stock/export-template
// @access  Private (Admin)
export const exportStockTemplate = async (req, res, next) => {
    try {
        const { format } = req.query;

        const headers = [
            'MAC Address',
            'Asset Type',
            'Device Type',
            'Site Name',
            'Serial Number',
            'Make',
            'Model',
            'Stock Location',
            'Quantity',
            'Unit',
            'Remarks'
        ];

        const sampleData = [
            {
                'MAC Address': '00:1A:2B:3C:4D:5E',
                'Asset Type': 'Camera',
                'Device Type': 'Fixed Dome',
                'Site Name': 'Head Office',
                'Serial Number': 'HK12345678',
                'Make': 'Hikvision',
                'Model': 'DS-2CD2143G2-I',
                'Stock Location': 'Rack A - Shelf 1',
                'Quantity': 1,
                'Unit': 'Nos',
                'Remarks': 'Sample remark'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventory Template');

        if (format === 'csv') {
            const csv = XLSX.utils.sheet_to_csv(ws);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=stock_import_template.csv');
            return res.status(200).send(csv);
        } else {
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=stock_import_template.xlsx');
            return res.status(200).send(buffer);
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Perform stock replacement for a ticket
// @route   POST /api/stock/replace
// @access  Private
export const performStockReplacement = async (req, res, next) => {
    try {
        const { ticketId, defectiveAssetId, spareAssetId, newIp } = req.body;

        if (!ticketId || !defectiveAssetId || !spareAssetId) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const [ticket, defectiveAsset, spareAsset] = await Promise.all([
            Ticket.findById(ticketId),
            Asset.findById(defectiveAssetId),
            Asset.findById(spareAssetId)
        ]);

        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
        if (!defectiveAsset) return res.status(404).json({ success: false, message: 'Defective asset not found' });
        if (!spareAsset) return res.status(404).json({ success: false, message: 'Spare asset not found' });

        if (spareAsset.status !== 'Spare') {
            return res.status(400).json({ success: false, message: 'Selected item is not a spare' });
        }

        // Keep track of old details for logging
        const oldDetails = {
            assetCode: defectiveAsset.assetCode,
            serialNumber: defectiveAsset.serialNumber || 'N/A',
            mac: defectiveAsset.mac || 'N/A',
            ipAddress: defectiveAsset.ipAddress || 'N/A',
            make: defectiveAsset.make || 'N/A',
            model: defectiveAsset.model || 'N/A'
        };

        // Update ONLY the hardware-specific fields on the EXISTING asset.
        // assetCode is a FIXED IDENTIFIER and must NEVER change.
        // This preserves the full RMA history against the same asset code.
        defectiveAsset.serialNumber = spareAsset.serialNumber;
        defectiveAsset.mac = spareAsset.mac;
        defectiveAsset.ipAddress = newIp || defectiveAsset.ipAddress;
        defectiveAsset.make = spareAsset.make;
        defectiveAsset.model = spareAsset.model;
        defectiveAsset.status = 'Operational'; // Ensure it's back to operational

        await defectiveAsset.save();

        // Mark the spare asset as Decommissioned (NOT deleted) so we keep a record
        spareAsset.status = 'Decommissioned';
        spareAsset.remark = `Consumed as replacement for ${defectiveAsset.assetCode} (Ticket: ${ticketId})`;
        spareAsset.isActive = false;
        await spareAsset.save();

        // Create StockReplacement record
        await StockReplacement.create({
            ticketId,
            assetId: defectiveAssetId,
            spareAssetId: spareAssetId,
            oldDetails,
            newDetails: {
                assetCode: defectiveAsset.assetCode, // unchanged — same asset code
                serialNumber: spareAsset.serialNumber,
                mac: spareAsset.mac,
                ipAddress: newIp || defectiveAsset.ipAddress,
                make: spareAsset.make,
                model: spareAsset.model
            },
            replacedBy: req.user._id,
            replacedOn: new Date()
        });

        // Record activity
        await TicketActivity.create({
            ticketId,
            userId: req.user._id,
            activityType: 'Resolution',
            content: `Item replacement performed using stock.\nOld Hardware: [SN: ${oldDetails.serialNumber}, MAC: ${oldDetails.mac}]\nNew Hardware: [SN: ${spareAsset.serialNumber}, MAC: ${spareAsset.mac}]\nNew IP Address: ${newIp || oldDetails.ipAddress}`
        });

        // Optionally update ticket status if needed, but let's keep it handled by UI

        res.status(200).json({
            success: true,
            message: 'Stock replacement successful',
            data: defectiveAsset
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get replacement history for an asset (Unified RMA + Stock)
// @route   GET /api/stock/asset/:assetId/history
// @access  Private
export const getAssetReplacementHistory = async (req, res, next) => {
    try {
        const { assetId } = req.params;

        const [stockHistory, rmaHistory] = await Promise.all([
            StockReplacement.find({ assetId })
                .populate('ticketId', 'ticketNumber')
                .populate('replacedBy', 'fullName')
                .sort({ replacedOn: -1 }),
            RMARequest.find({ originalAssetId: assetId, status: 'Installed' })
                .populate('ticketId', 'ticketNumber')
                .populate('installedBy', 'fullName')
                .sort({ installedOn: -1 })
        ]);

        // Combine and format
        const combined = [
            ...stockHistory.map(h => ({
                id: h._id,
                type: 'Stock',
                date: h.replacedOn,
                ticketNumber: h.ticketId?.ticketNumber,
                oldDetails: h.oldDetails,
                newDetails: h.newDetails,
                performedBy: h.replacedBy?.fullName,
                remarks: 'Replaced from local/HO stock'
            })),
            ...rmaHistory.map(h => ({
                id: h._id,
                type: 'RMA',
                date: h.installedOn,
                ticketNumber: h.ticketId?.ticketNumber,
                oldDetails: h.originalDetailsSnapshot,
                newDetails: h.replacementDetails,
                performedBy: h.installedBy?.fullName,
                remarks: h.requestReason
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            success: true,
            data: combined
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get stock movement logs
// @route   GET /api/stock/movement-logs
// @access  Private
export const getStockMovementLogs = async (req, res, next) => {
    try {
        const {
            siteId,
            assetId,
            assetType,
            movementType,
            fromDate,
            toDate,
            page = 1,
            limit = 50
        } = req.query;
        const user = req.user;

        let query = {};

        // Filter by site (either source or destination)
        if (siteId) {
            query.$or = [
                { fromSiteId: new mongoose.Types.ObjectId(siteId) },
                { toSiteId: new mongoose.Types.ObjectId(siteId) }
            ];
        } else if (user.role !== 'Admin') {
            // Non-admins see only their sites
            const userSites = (user.assignedSites || []).map(s => new mongoose.Types.ObjectId(s));
            query.$or = [
                { fromSiteId: { $in: userSites } },
                { toSiteId: { $in: userSites } }
            ];
        }

        if (assetId) {
            query.assetId = new mongoose.Types.ObjectId(assetId);
        }

        if (assetType) {
            query['assetSnapshot.assetType'] = assetType;
        }

        if (movementType) {
            query.movementType = movementType;
        }

        // Date range filter
        if (fromDate || toDate) {
            query.createdAt = {};
            if (fromDate) query.createdAt.$gte = new Date(fromDate);
            if (toDate) query.createdAt.$lte = new Date(toDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [logs, total] = await Promise.all([
            StockMovementLog.find(query)
                .populate('assetId', 'assetCode assetType serialNumber')
                .populate('fromSiteId', 'siteName isHeadOffice')
                .populate('toSiteId', 'siteName isHeadOffice')
                .populate('performedBy', 'fullName')
                .populate('rmaId', 'rmaNumber')
                .populate('requisitionId', 'requisitionNumber')
                .populate('ticketId', 'ticketNumber')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            StockMovementLog.countDocuments(query)
        ]);

        // Get counts by movement type for dashboard
        const typeCounts = await StockMovementLog.aggregate([
            { $match: query },
            { $group: { _id: '$movementType', count: { $sum: 1 } } }
        ]);

        res.json({
            success: true,
            data: logs,
            typeCounts: typeCounts.reduce((acc, tc) => {
                acc[tc._id] = tc.count;
                return acc;
            }, {}),
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

// @desc    Get movement stats for dashboard
// @route   GET /api/stock/movement-stats
// @access  Private
export const getMovementStats = async (req, res, next) => {
    try {
        const { siteId, days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        let matchQuery = { createdAt: { $gte: startDate } };

        if (siteId) {
            matchQuery.$or = [
                { fromSiteId: new mongoose.Types.ObjectId(siteId) },
                { toSiteId: new mongoose.Types.ObjectId(siteId) }
            ];
        }

        const stats = await StockMovementLog.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$movementType',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get recent movements
        const recentMovements = await StockMovementLog.find(matchQuery)
            .populate('assetId', 'assetCode assetType')
            .populate('toSiteId', 'siteName isHeadOffice')
            .populate('fromSiteId', 'siteName isHeadOffice')
            .populate('performedBy', 'fullName')
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            success: true,
            data: {
                stats: stats.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
                recentMovements
            }
        });
    } catch (error) {
        next(error);
    }
};
