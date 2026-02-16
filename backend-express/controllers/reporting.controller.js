import Ticket from '../models/Ticket.model.js';
import Asset from '../models/Asset.model.js';
import User from '../models/User.model.js';
import RMARequest from '../models/RMARequest.model.js';
import DailyWorkLog from '../models/DailyWorkLog.model.js';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';

// Utility to build date range query
const buildDateQuery = (startDate, endDate, field = 'createdAt') => {
  const query = {};
  if (startDate || endDate) {
    query[field] = {};
    if (startDate) query[field].$gte = new Date(startDate);
    if (endDate) query[field].$lte = new Date(endDate);
  }
  return query;
};

// @desc    Get ticket statistics
// @route   GET /api/reporting/tickets
// @access  Private
export const getTicketStats = async (req, res, next) => {
  try {
    const { startDate, endDate, siteId } = req.query;

    const dateQuery = buildDateQuery(startDate, endDate);
    const matchStage = { ...dateQuery };

    if (siteId) {
      matchStage.siteId = new mongoose.Types.ObjectId(siteId);
    }

    // Run aggregations in parallel for performance
    const [statusStats, priorityStats, categoryStats, resolutionStats] = await Promise.all([
      // Status Distribution
      Ticket.aggregate([
        { $match: matchStage },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Priority Distribution
      Ticket.aggregate([
        { $match: matchStage },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),

      // Category Distribution
      Ticket.aggregate([
        { $match: matchStage },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),

      // Avg Resolution Time
      Ticket.aggregate([
        {
          $match: {
            ...matchStage,
            status: { $in: ['Resolved', 'Verified', 'Closed'] },
            resolvedOn: { $exists: true }
          }
        },
        {
          $project: {
            resolutionTimeHours: {
              $divide: [{ $subtract: ['$resolvedOn', '$createdAt'] }, 1000 * 60 * 60]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgResolutionTime: { $avg: '$resolutionTimeHours' },
            minResolutionTime: { $min: '$resolutionTimeHours' },
            maxResolutionTime: { $max: '$resolutionTimeHours' }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        status: statusStats,
        priority: priorityStats,
        category: categoryStats,
        resolution: resolutionStats[0] || null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get SLA performance stats
// @route   GET /api/reporting/sla
// @access  Private
export const getSLAPerformance = async (req, res, next) => {
  try {
    const { startDate, endDate, siteId } = req.query;
    const dateQuery = buildDateQuery(startDate, endDate);
    const matchStage = { ...dateQuery };

    if (siteId) {
      matchStage.siteId = new mongoose.Types.ObjectId(siteId);
    }

    const slaStats = await Ticket.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            breached: '$isSLARestoreBreached',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Simplify structure for frontend
    const summary = {
      breached: 0,
      met: 0,
      total: 0
    };

    slaStats.forEach(stat => {
      // If breached is true, it's missed. 
      // If breached is false or undefined, AND it is resolved/closed, we count as met.
      // If it's still open and not breached yet, it's pending (or 'met' so far).
      // Let's stick to explicit flags if available.

      const isBreached = stat._id.breached === true;
      const count = stat.count;
      summary.total += count;

      if (isBreached) {
        summary.breached += count;
      } else {
        summary.met += count;
      }
    });

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Asset statistics
// @route   GET /api/reporting/assets
// @access  Private
export const getAssetStats = async (req, res, next) => {
  try {
    const { siteId } = req.query;
    const matchStage = {};

    if (siteId) {
      matchStage.siteId = new mongoose.Types.ObjectId(siteId);
    }

    // Exclude Spare assets from reporting counts
    matchStage.status = { $ne: 'Spare' };

    const [typeStats, statusStats] = await Promise.all([
      Asset.aggregate([
        { $match: { ...matchStage, status: { $ne: 'Spare' } } },
        { $group: { _id: '$deviceType', count: { $sum: 1 } } }
      ]),
      Asset.aggregate([
        { $match: { ...matchStage, status: { $ne: 'Spare' } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        byType: typeStats,
        byStatus: statusStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get RMA statistics
// @route   GET /api/reporting/rma
// @access  Private
export const getRMAStats = async (req, res, next) => {
  try {
    const { startDate, endDate, siteId } = req.query;
    const dateQuery = buildDateQuery(startDate, endDate);
    const matchStage = { ...dateQuery };

    if (siteId) {
      matchStage.siteId = new mongoose.Types.ObjectId(siteId);
    }

    // Run aggregations in parallel
    const [statusStats, trendStats] = await Promise.all([
      // RMA by Status
      RMARequest.aggregate([
        { $match: matchStage },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // RMA Trend (by month)
      RMARequest.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    // Format trend data for frontend
    const formattedTrend = trendStats.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      count: item.count
    }));

    // Total counts
    const totalRMAs = statusStats.reduce((acc, curr) => acc + curr.count, 0);
    const pendingRMAs = statusStats
      .filter(s => ['Requested', 'Approved', 'Ordered', 'Dispatched'].includes(s._id))
      .reduce((acc, curr) => acc + curr.count, 0);
    const completedRMAs = statusStats
      .filter(s => ['Installed'].includes(s._id))
      .reduce((acc, curr) => acc + curr.count, 0);
    const rejectedRMAs = statusStats
      .filter(s => s._id === 'Rejected')
      .reduce((acc, curr) => acc + curr.count, 0);

    res.json({
      success: true,
      data: {
        byStatus: statusStats,
        trend: formattedTrend,
        summary: {
          total: totalRMAs,
          pending: pendingRMAs,
          completed: completedRMAs,
          rejected: rejectedRMAs
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export report to Excel
// @route   GET /api/reporting/export
// @access  Private
export const exportReport = async (req, res, next) => {
  try {
    const { startDate, endDate, siteId } = req.query;

    const dateQuery = buildDateQuery(startDate, endDate);
    const query = { ...dateQuery };

    if (siteId) {
      query.siteId = siteId;
    }

    // Fetch tickets with related data
    const tickets = await Ticket.find(query)
      .populate('siteId', 'siteName')
      .populate('assetId', 'assetCode assetType')
      .populate('assignedTo', 'fullName')
      .populate('createdBy', 'fullName')
      .sort({ createdAt: -1 })
      .lean();

    // Transform data for Excel
    const data = tickets.map(ticket => ({
      'Ticket Number': ticket.ticketNumber,
      'Title': ticket.title,
      'Status': ticket.status,
      'Priority': ticket.priority,
      'Category': ticket.category,
      'Site': ticket.siteId?.siteName || 'N/A',
      'Asset': ticket.assetId?.assetCode || 'N/A',
      'Created By': ticket.createdBy?.fullName || 'System',
      'Assigned To': ticket.assignedTo?.fullName || 'Unassigned',
      'Created On': ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '',
      'Resolved On': ticket.resolvedOn ? new Date(ticket.resolvedOn).toLocaleString() : '',
      'SLA Status': ticket.isSLARestoreBreached ? 'Breached' : 'On Track'
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Tickets Report');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for download
    res.setHeader('Content-Disposition', 'attachment; filename="tickets-report.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Send buffer
    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    next(error);
  }
};

// @desc    Export Employee Status Report to Excel
// @route   GET /api/reporting/export/employees
// @access  Private
export const exportEmployeeStatusReport = async (req, res, next) => {
  try {
    const { siteId } = req.query;

    const matchStage = {};

    // If siteId is provided and not 'all', filter by site
    if (siteId && siteId !== 'all') {
      matchStage.$or = [
        { siteId: new mongoose.Types.ObjectId(siteId) },
        { assignedSites: new mongoose.Types.ObjectId(siteId) }
      ];
    }

    // Fetch employees with related data
    const employees = await User.find(matchStage)
      .populate('siteId', 'siteName siteCode city')
      .populate('assignedSites', 'siteName siteCode city')
      .sort({ fullName: 1 })
      .lean();

    // Get ticket statistics per employee
    const employeeIds = employees.map(e => e._id);
    const ticketStats = await Ticket.aggregate([
      { $match: { assignedTo: { $in: employeeIds } } },
      {
        $group: {
          _id: { assignedTo: '$assignedTo', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Create a map for quick lookup
    const statsMap = {};
    ticketStats.forEach(stat => {
      const empId = stat._id.assignedTo.toString();
      if (!statsMap[empId]) {
        statsMap[empId] = { Open: 0, InProgress: 0, Resolved: 0, Closed: 0, Total: 0 };
      }
      const status = stat._id.status.replace(/\s/g, '');
      if (statsMap[empId][status] !== undefined) {
        statsMap[empId][status] = stat.count;
      }
      statsMap[empId].Total += stat.count;
    });

    // Transform data for Excel
    const data = employees.map(emp => {
      const empStats = statsMap[emp._id.toString()] || { Open: 0, InProgress: 0, Resolved: 0, Closed: 0, Total: 0 };
      const primarySite = emp.siteId?.siteName || 'Not Assigned';
      const assignedSitesList = emp.assignedSites?.map(s => s.siteName).join(', ') || 'None';

      return {
        'Employee Name': emp.fullName,
        'Email': emp.email,
        'Username': emp.username,
        'Role': emp.role,
        'Designation': emp.designation || 'N/A',
        'Mobile': emp.mobileNumber || 'N/A',
        'Primary Site': primarySite,
        'Assigned Sites': assignedSitesList,
        'Status': emp.isActive ? 'Active' : 'Inactive',
        'Last Login': emp.lastLoginOn ? new Date(emp.lastLoginOn).toLocaleString() : 'Never',
        'Open Tickets': empStats.Open,
        'In Progress Tickets': empStats.InProgress,
        'Resolved Tickets': empStats.Resolved,
        'Closed Tickets': empStats.Closed,
        'Total Tickets': empStats.Total
      };
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
      { wch: 15 }, { wch: 25 }, { wch: 40 }, { wch: 10 }, { wch: 20 },
      { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 14 }
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Employee Status Report');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const siteSuffix = siteId && siteId !== 'all' ? `_site_${siteId}` : '_all_sites';
    const filename = `employee_status_report${siteSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Send buffer
    res.send(buffer);
  } catch (error) {
    console.error('Employee export error:', error);
    next(error);
  }
};

// @desc    Export Asset Status Report to Excel
// @route   GET /api/reporting/export/assets
// @access  Private
export const exportAssetStatusReport = async (req, res, next) => {
  try {
    const { siteId } = req.query;

    const matchStage = {};

    // If siteId is provided and not 'all', filter by site
    if (siteId && siteId !== 'all') {
      matchStage.siteId = new mongoose.Types.ObjectId(siteId);
    }

    // Exclude Spare assets from asset status report
    matchStage.status = { $ne: 'Spare' };

    // Fetch assets with related data
    const assets = await Asset.find(matchStage)
      .populate('siteId', 'siteName siteCode city')
      .sort({ assetCode: 1 })
      .lean();

    // Get RMA count per asset
    const assetIds = assets.map(a => a._id);
    const rmaStats = await RMARequest.aggregate([
      { $match: { originalAssetId: { $in: assetIds } } },
      {
        $group: {
          _id: '$originalAssetId',
          rmaCount: { $sum: 1 },
          lastRmaDate: { $max: '$createdAt' }
        }
      }
    ]);

    // Create a map for quick lookup
    const rmaMap = {};
    rmaStats.forEach(stat => {
      rmaMap[stat._id.toString()] = {
        rmaCount: stat.rmaCount,
        lastRmaDate: stat.lastRmaDate
      };
    });

    // Transform data for Excel
    const data = assets.map(asset => {
      const rmaInfo = rmaMap[asset._id.toString()] || { rmaCount: 0, lastRmaDate: null };

      return {
        'Asset Code': asset.assetCode,
        'Asset Type': asset.assetType,
        'Device Type': asset.deviceType || 'N/A',
        'Status': asset.status,
        'Make': asset.make || 'N/A',
        'Model': asset.model || 'N/A',
        'Serial Number': asset.serialNumber || 'N/A',
        'IP Address': asset.ipAddress || 'N/A',
        'MAC Address': asset.mac || 'N/A',
        'Site': asset.siteId?.siteName || 'N/A',
        'Site Code': asset.siteId?.siteCode || 'N/A',
        'City': asset.siteId?.city || 'N/A',
        'Location Name': asset.locationName || 'N/A',
        'Location Description': asset.locationDescription || 'N/A',
        'Criticality': asset.criticality ?? 2, 'VMS Ref ID': asset.vmsReferenceId || 'N/A',
        'NMS Ref ID': asset.nmsReferenceId || 'N/A',
        'Installation Date': asset.installationDate ? new Date(asset.installationDate).toLocaleDateString() : 'N/A',
        'Warranty End Date': asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString() : 'N/A',
        'RMA Count': rmaInfo.rmaCount,
        'Last RMA Date': rmaInfo.lastRmaDate ? new Date(rmaInfo.lastRmaDate).toLocaleDateString() : 'N/A',
        'Created On': asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : 'N/A',
        'Last Updated': asset.updatedAt ? new Date(asset.updatedAt).toLocaleDateString() : 'N/A'
      };
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Set column widths (23 columns)
    ws['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 18 },
      { wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 25 },
      { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 12 },
      { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 12 },
      { wch: 18 }, { wch: 15 }, { wch: 15 }
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Asset Status Report');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const siteSuffix = siteId && siteId !== 'all' ? `_site_${siteId}` : '_all_sites';
    const filename = `asset_status_report${siteSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Send buffer
    res.send(buffer);
  } catch (error) {
    console.error('Asset export error:', error);
    next(error);
  }
};

// @desc    Export RMA Report to Excel
// @route   GET /api/reporting/export/rma
// @access  Private
export const exportRMAReport = async (req, res, next) => {
  try {
    const { siteId, startDate, endDate } = req.query;

    const dateQuery = buildDateQuery(startDate, endDate);
    const matchStage = { ...dateQuery };

    // If siteId is provided and not 'all', filter by site
    if (siteId && siteId !== 'all') {
      matchStage.siteId = new mongoose.Types.ObjectId(siteId);
    }

    // Fetch RMA requests with related data
    // Note: Using originalAssetId as per RMARequest schema
    const rmaRequests = await RMARequest.find(matchStage)
      .populate('originalAssetId', 'assetCode assetType deviceType serialNumber')
      .populate('ticketId', 'ticketNumber title')
      .populate('siteId', 'siteName siteCode city')
      .populate('requestedBy', 'fullName')
      .populate('approvedBy', 'fullName')
      .populate('installedBy', 'fullName')
      .sort({ createdAt: -1 })
      .lean();

    // Helper function to get date from timeline by status
    const getTimelineDate = (timeline, status) => {
      if (!timeline || !Array.isArray(timeline)) return null;
      const entry = timeline.find(t => t.status === status);
      return entry?.changedOn || null;
    };

    // Transform data for Excel
    const data = rmaRequests.map(rma => {
      // Get dates from timeline
      const approvedDate = getTimelineDate(rma.timeline, 'Approved') || rma.approvedOn;
      const orderedDate = getTimelineDate(rma.timeline, 'Ordered');
      const dispatchedDate = getTimelineDate(rma.timeline, 'Dispatched');
      const receivedDate = getTimelineDate(rma.timeline, 'Received');
      const installedDate = getTimelineDate(rma.timeline, 'Installed') || rma.installedOn;

      return {
        'RMA ID': rma._id.toString().slice(-8).toUpperCase(),
        'Ticket Number': rma.ticketId?.ticketNumber || 'N/A',
        'Ticket Title': rma.ticketId?.title || 'N/A',
        'Asset Code': rma.originalAssetId?.assetCode || 'N/A',
        'Asset Type': rma.originalAssetId?.assetType || 'N/A',
        'Device Type': rma.originalAssetId?.deviceType || 'N/A',
        'Original Serial': rma.originalDetailsSnapshot?.serialNumber || rma.originalAssetId?.serialNumber || 'N/A',
        'Site': rma.siteId?.siteName || 'N/A',
        'Site Code': rma.siteId?.siteCode || 'N/A',
        'City': rma.siteId?.city || 'N/A',
        'Status': rma.status,
        'Request Reason': rma.requestReason || 'N/A',
        'Requested By': rma.requestedBy?.fullName || 'N/A',
        'Approved By': rma.approvedBy?.fullName || 'N/A',
        'Installed By': rma.installedBy?.fullName || 'N/A',
        'Requested Date': rma.createdAt ? new Date(rma.createdAt).toLocaleString() : 'N/A',
        'Approval Date': approvedDate ? new Date(approvedDate).toLocaleString() : 'N/A',
        'Order Date': orderedDate ? new Date(orderedDate).toLocaleString() : 'N/A',
        'Dispatch Date': dispatchedDate ? new Date(dispatchedDate).toLocaleString() : 'N/A',
        'Received Date': receivedDate ? new Date(receivedDate).toLocaleString() : 'N/A',
        'Installation Date': installedDate ? new Date(installedDate).toLocaleString() : 'N/A',
        'Replacement Serial': rma.replacementDetails?.serialNumber || 'N/A',
        'Replacement IP': rma.replacementDetails?.ipAddress || 'N/A',
        'Tracking Number': rma.shippingDetails?.trackingNumber || 'N/A',
        'Vendor': rma.vendorDetails?.vendorName || 'N/A',
        'Order ID': rma.vendorDetails?.orderId || 'N/A'
      };
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 },
      { wch: 18 }, { wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 15 },
      { wch: 12 }, { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
      { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
      { wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
      { wch: 15 }
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'RMA Report');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const siteSuffix = siteId && siteId !== 'all' ? `_site_${siteId}` : '_all_sites';
    const filename = `rma_report${siteSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Send buffer
    res.send(buffer);
  } catch (error) {
    console.error('RMA export error:', error);
    next(error);
  }
};

// @desc    Export Spare Stock Report to Excel
// @route   GET /api/reporting/export/spare-stock
// @access  Private
export const exportSpareStockReport = async (req, res, next) => {
  try {
    const { siteId } = req.query;

    const matchStage = {};

    // If siteId is provided and not 'all', filter by site
    if (siteId && siteId !== 'all') {
      matchStage.siteId = new mongoose.Types.ObjectId(siteId);
    }

    // Filter for Spare assets only
    matchStage.status = 'Spare';

    // Fetch assets with related data
    const assets = await Asset.find(matchStage)
      .populate('siteId', 'siteName siteCode city')
      .sort({ assetCode: 1 })
      .lean();

    // Transform data for Excel
    const data = assets.map(asset => {
      return {
        'Asset Code': asset.assetCode,
        'Asset Type': asset.assetType,
        'Device Type': asset.deviceType || 'N/A',
        'Status': asset.status,
        'Make': asset.make || 'N/A',
        'Model': asset.model || 'N/A',
        'Serial Number': asset.serialNumber || 'N/A',
        'IP Address': asset.ipAddress || 'N/A',
        'MAC Address': asset.mac || 'N/A',
        'Site': asset.siteId?.siteName || 'N/A',
        'Site Code': asset.siteId?.siteCode || 'N/A',
        'City': asset.siteId?.city || 'N/A',
        'Criticality': asset.criticality ?? 2,
        'NMS Ref ID': asset.nmsReferenceId || 'N/A',
        'Created On': asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : 'N/A',
        'Last Updated': asset.updatedAt ? new Date(asset.updatedAt).toLocaleDateString() : 'N/A'
      };
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 18 },
      { wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 25 },
      { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Spare Stock Report');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const siteSuffix = siteId && siteId !== 'all' ? `_site_${siteId}` : '_all_sites';
    const filename = `spare_stock_report${siteSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Send buffer
    res.send(buffer);
  } catch (error) {
    console.error('Spare stock export error:', error);
    next(error);
  }
};

// @desc    Export Work Activity Report to Excel
// @route   GET /api/reporting/export/work-activity
// @access  Private (Admin, Supervisor)
export const exportWorkActivityReport = async (req, res, next) => {
  try {
    const { startDate, endDate, siteId, userId } = req.query;

    const query = {};

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // User filter
    if (userId && userId !== 'all') {
      query.userId = new mongoose.Types.ObjectId(userId);
    }

    // Fetch work logs with populated user data
    const logs = await DailyWorkLog.find(query)
      .populate('userId', 'fullName role')
      .populate('activities.ticketRef', 'ticketNumber')
      .populate('activities.siteId', 'siteName')
      .sort({ date: -1, userId: 1 })
      .lean();

    // Flatten activities for Excel rows
    const reportData = [];

    logs.forEach(log => {
      const user = log.userId || { fullName: 'Unknown', role: 'N/A' };
      const dateStr = new Date(log.date).toLocaleDateString();

      // If no activities but has a summary, we could add a row for that, 
      // but usually we want to list the activities.
      if (log.activities.length === 0 && log.dailySummary) {
        reportData.push({
          'Date': dateStr,
          'User': user.fullName,
          'Role': user.role,
          'Type': 'Summary',
          'Category': 'Daily Summary',
          'Description': log.dailySummary,
          'Duration': '',
          'Reference': '',
          'Timestamp': ''
        });
      }

      log.activities.forEach(activity => {
        // Site filter (post-process if not indexed at top level)
        if (siteId && siteId !== 'all' && activity.siteId?._id?.toString() !== siteId) {
          return;
        }

        let reference = '';
        if (activity.ticketRef) reference = activity.ticketRef.ticketNumber || '';
        if (activity.refModel === 'Asset') reference = activity.metadata?.assetCode || '';
        if (activity.refModel === 'RMARequest') reference = activity.metadata?.rmaNumber || '';

        reportData.push({
          'Date': dateStr,
          'User': user.fullName,
          'Role': user.role,
          'Type': activity.type === 'auto' ? 'Automated' : 'Manual',
          'Category': activity.category,
          'Description': activity.description,
          'Duration': activity.duration ? `${activity.duration} mins` : '',
          'Reference': reference,
          'Timestamp': activity.timestamp ? new Date(activity.timestamp).toLocaleTimeString() : '',
          'Daily Summary': log.dailySummary || ''
        });
      });
    });

    if (reportData.length === 0) {
      // Create a dummy row so Excel isn't empty
      reportData.push({ 'Message': 'No activity found for the selected criteria' });
    }

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(reportData);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 18 },
      { wch: 50 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 50 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Work Activity Report');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `work_activity_report_${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Work activity export error:', error);
    next(error);
  }
};
