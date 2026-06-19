import Ticket from '../models/Ticket.model.js';
import Asset from '../models/Asset.model.js';
import User from '../models/User.model.js';
import RMARequest from '../models/RMARequest.model.js';
import DailyWorkLog from '../models/DailyWorkLog.model.js';
import TicketActivity from '../models/TicketActivity.model.js';
import mongoose from 'mongoose';
import {
  generateTicketsReport,
  generateEmployeesReport,
  generateAssetsReport,
  generateRMAReport,
  generateSpareStockReport,
  generateWorkActivityReport,
  generateUserActivitiesReport,
} from '../utils/reportHtmlGenerator.js';
import {
  buildTicketsExcel,
  buildEmployeesExcel,
  buildAssetsExcel,
  buildRMAExcel,
  buildSpareStockExcel,
  buildWorkActivityExcel,
  buildUserActivitiesExcel,
} from '../utils/excelStyler.js';

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

    if (siteId && siteId !== 'all') {
      query.siteId = new mongoose.Types.ObjectId(siteId);
    }

    // Fetch tickets with related data
    const tickets = await Ticket.find(query)
      .populate('siteId', 'siteName')
      .populate('assetId', 'assetCode assetType')
      .populate('assignedTo', 'fullName')
      .populate('createdBy', 'fullName')
      .sort({ createdAt: -1 })
      .lean();

    const buffer = await buildTicketsExcel(tickets);
    const filename = `tickets_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
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

    const buffer = await buildEmployeesExcel(employees, statsMap);
    const siteSuffix = siteId && siteId !== 'all' ? `_site_${siteId}` : '_all_sites';
    const filename = `employee_status_report${siteSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
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

    const buffer = await buildAssetsExcel(assets, rmaMap);
    const siteSuffix = siteId && siteId !== 'all' ? `_site_${siteId}` : '_all_sites';
    const filename = `asset_status_report${siteSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
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

    // Build styled Excel
    const buffer = await buildRMAExcel(rmaRequests);
    const siteSuffix = siteId && siteId !== 'all' ? `_site_${siteId}` : '_all_sites';
    const filename = `rma_report${siteSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
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

    const buffer = await buildSpareStockExcel(assets);
    const siteSuffix = siteId && siteId !== 'all' ? `_site_${siteId}` : '_all_sites';
    const filename = `spare_stock_report${siteSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
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

    // Apply site filter post-fetch (activities have nested siteId)
    const filteredLogs = logs.map(log => ({
      ...log,
      activities: log.activities.filter(act =>
        !siteId || siteId === 'all' || act.siteId?._id?.toString() === siteId
      ),
    })).filter(log => log.activities.length > 0 || !siteId || siteId === 'all');

    const buffer = await buildWorkActivityExcel(filteredLogs);
    const filename = `work_activity_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Work activity export error:', error);
    next(error);
  }
};

// @desc    Export User Activities Report to Excel (Ticket-level activities per user)
// @route   GET /api/reporting/export/user-activities
// @access  Private (Admin, Supervisor)
export const exportUserActivitiesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, userId } = req.query;

    const query = {};

    // Date range filter (TicketActivity uses createdOn via timestamps option)
    if (startDate || endDate) {
      query.createdOn = {};
      if (startDate) query.createdOn.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdOn.$lte = end;
      }
    }

    // User filter
    if (userId && userId !== 'all') {
      query.userId = new mongoose.Types.ObjectId(userId);
    }

    // Fetch ticket activities with populated user and ticket data
    const activities = await TicketActivity.find(query)
      .populate('userId', 'fullName role')
      .populate('ticketId', 'ticketNumber title category priority status')
      .sort({ createdOn: -1 })
      .lean();

    const buffer = await buildUserActivitiesExcel(activities);
    const filename = `user_activities_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('User activities export error:', error);
    next(error);
  }
};

// ─── HTML REPORT EXPORTS ────────────────────────────────────────────────────

function buildFilterInfo(startDate, endDate, siteId) {
  const parts = [];
  if (startDate) parts.push(`From: ${new Date(startDate).toLocaleDateString('en-IN')}`);
  if (endDate) parts.push(`To: ${new Date(endDate).toLocaleDateString('en-IN')}`);
  if (siteId && siteId !== 'all') parts.push('Filtered by site');
  return parts.join(' &nbsp;|&nbsp; ') || 'All data';
}

function sendHtml(res, html, filename) {
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

// @route GET /api/reporting/export/html/tickets
export const exportTicketsHtml = async (req, res, next) => {
  try {
    const { startDate, endDate, siteId } = req.query;
    const query = { ...buildDateQuery(startDate, endDate) };
    if (siteId && siteId !== 'all') query.siteId = new mongoose.Types.ObjectId(siteId);

    const tickets = await Ticket.find(query)
      .populate('siteId', 'siteName')
      .populate('assetId', 'assetCode')
      .populate('assignedTo', 'fullName')
      .populate('createdBy', 'fullName')
      .sort({ createdAt: -1 })
      .lean();

    const html = generateTicketsReport({ tickets, filterInfo: buildFilterInfo(startDate, endDate, siteId) });
    sendHtml(res, html, `tickets_report_${new Date().toISOString().slice(0, 10)}.html`);
  } catch (error) {
    console.error('HTML Tickets export error:', error);
    next(error);
  }
};

// @route GET /api/reporting/export/html/employees
export const exportEmployeesHtml = async (req, res, next) => {
  try {
    const { siteId } = req.query;
    const matchStage = {};
    if (siteId && siteId !== 'all') {
      matchStage.$or = [
        { siteId: new mongoose.Types.ObjectId(siteId) },
        { assignedSites: new mongoose.Types.ObjectId(siteId) },
      ];
    }

    const employees = await User.find(matchStage)
      .populate('siteId', 'siteName siteCode city')
      .populate('assignedSites', 'siteName')
      .sort({ fullName: 1 })
      .lean();

    const employeeIds = employees.map(e => e._id);
    const ticketStats = await Ticket.aggregate([
      { $match: { assignedTo: { $in: employeeIds } } },
      { $group: { _id: { assignedTo: '$assignedTo', status: '$status' }, count: { $sum: 1 } } },
    ]);

    const statsMap = {};
    ticketStats.forEach(stat => {
      const id = stat._id.assignedTo.toString();
      if (!statsMap[id]) statsMap[id] = { Open: 0, InProgress: 0, Resolved: 0, Closed: 0, Total: 0 };
      const status = stat._id.status.replace(/\s/g, '');
      if (statsMap[id][status] !== undefined) statsMap[id][status] = stat.count;
      statsMap[id].Total += stat.count;
    });

    const html = generateEmployeesReport({ employees, statsMap, filterInfo: buildFilterInfo(null, null, siteId) });
    sendHtml(res, html, `employee_status_report_${new Date().toISOString().slice(0, 10)}.html`);
  } catch (error) {
    console.error('HTML Employees export error:', error);
    next(error);
  }
};

// @route GET /api/reporting/export/html/assets
export const exportAssetsHtml = async (req, res, next) => {
  try {
    const { siteId } = req.query;
    const matchStage = { status: { $ne: 'Spare' } };
    if (siteId && siteId !== 'all') matchStage.siteId = new mongoose.Types.ObjectId(siteId);

    const assets = await Asset.find(matchStage)
      .populate('siteId', 'siteName siteCode city')
      .sort({ assetCode: 1 })
      .lean();

    const assetIds = assets.map(a => a._id);
    const rmaStats = await RMARequest.aggregate([
      { $match: { originalAssetId: { $in: assetIds } } },
      { $group: { _id: '$originalAssetId', rmaCount: { $sum: 1 }, lastRmaDate: { $max: '$createdAt' } } },
    ]);

    const rmaMap = {};
    rmaStats.forEach(s => { rmaMap[s._id.toString()] = { rmaCount: s.rmaCount, lastRmaDate: s.lastRmaDate }; });

    const html = generateAssetsReport({ assets, rmaMap, filterInfo: buildFilterInfo(null, null, siteId) });
    sendHtml(res, html, `asset_status_report_${new Date().toISOString().slice(0, 10)}.html`);
  } catch (error) {
    console.error('HTML Assets export error:', error);
    next(error);
  }
};

// @route GET /api/reporting/export/html/rma
export const exportRMAHtml = async (req, res, next) => {
  try {
    const { startDate, endDate, siteId } = req.query;
    const matchStage = { ...buildDateQuery(startDate, endDate) };
    if (siteId && siteId !== 'all') matchStage.siteId = new mongoose.Types.ObjectId(siteId);

    const rmaRequests = await RMARequest.find(matchStage)
      .populate('originalAssetId', 'assetCode assetType deviceType serialNumber')
      .populate('ticketId', 'ticketNumber title')
      .populate('siteId', 'siteName siteCode city')
      .populate('requestedBy', 'fullName')
      .populate('approvedBy', 'fullName')
      .sort({ createdAt: -1 })
      .lean();

    const html = generateRMAReport({ rmaRequests, filterInfo: buildFilterInfo(startDate, endDate, siteId) });
    sendHtml(res, html, `rma_report_${new Date().toISOString().slice(0, 10)}.html`);
  } catch (error) {
    console.error('HTML RMA export error:', error);
    next(error);
  }
};

// @route GET /api/reporting/export/html/spare-stock
export const exportSpareStockHtml = async (req, res, next) => {
  try {
    const { siteId } = req.query;
    const matchStage = { status: 'Spare' };
    if (siteId && siteId !== 'all') matchStage.siteId = new mongoose.Types.ObjectId(siteId);

    const assets = await Asset.find(matchStage)
      .populate('siteId', 'siteName siteCode city')
      .sort({ assetCode: 1 })
      .lean();

    const html = generateSpareStockReport({ assets, filterInfo: buildFilterInfo(null, null, siteId) });
    sendHtml(res, html, `spare_stock_report_${new Date().toISOString().slice(0, 10)}.html`);
  } catch (error) {
    console.error('HTML Spare Stock export error:', error);
    next(error);
  }
};

// @route GET /api/reporting/export/html/work-activity
export const exportWorkActivityHtml = async (req, res, next) => {
  try {
    const { startDate, endDate, siteId, userId } = req.query;
    const query = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    if (userId && userId !== 'all') query.userId = new mongoose.Types.ObjectId(userId);

    const logs = await DailyWorkLog.find(query)
      .populate('userId', 'fullName role')
      .populate('activities.ticketRef', 'ticketNumber')
      .populate('activities.siteId', 'siteName')
      .sort({ date: -1, userId: 1 })
      .lean();

    // Apply site filter post-query (activities have nested siteId)
    const filteredLogs = logs.map(log => ({
      ...log,
      activities: log.activities.filter(a =>
        !siteId || siteId === 'all' || a.siteId?._id?.toString() === siteId
      ),
    })).filter(log => log.activities.length > 0 || !siteId || siteId === 'all');

    const html = generateWorkActivityReport({ logs: filteredLogs, filterInfo: buildFilterInfo(startDate, endDate, siteId) });
    sendHtml(res, html, `work_activity_report_${new Date().toISOString().slice(0, 10)}.html`);
  } catch (error) {
    console.error('HTML Work Activity export error:', error);
    next(error);
  }
};

// @route GET /api/reporting/export/html/user-activities
export const exportUserActivitiesHtml = async (req, res, next) => {
  try {
    const { startDate, endDate, userId } = req.query;
    const query = {};
    if (startDate || endDate) {
      query.createdOn = {};
      if (startDate) query.createdOn.$gte = new Date(startDate);
      if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); query.createdOn.$lte = end; }
    }
    if (userId && userId !== 'all') query.userId = new mongoose.Types.ObjectId(userId);

    const activities = await TicketActivity.find(query)
      .populate('userId', 'fullName role')
      .populate('ticketId', 'ticketNumber title category priority status')
      .sort({ createdOn: -1 })
      .lean();

    const html = generateUserActivitiesReport({ activities, filterInfo: buildFilterInfo(startDate, endDate, null) });
    sendHtml(res, html, `user_activities_report_${new Date().toISOString().slice(0, 10)}.html`);
  } catch (error) {
    console.error('HTML User Activities export error:', error);
    next(error);
  }
};
