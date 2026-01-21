import Ticket from '../models/Ticket.model.js';
import Asset from '../models/Asset.model.js';
import User from '../models/User.model.js';
import RMARequest from '../models/RMARequest.model.js';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';

// Utility to build date range query
const buildDateQuery = (startDate, endDate, field = 'createdAt') => {
  const query = {};
  if (startDate || endDate) {
    query[field] = {};
    if (startDate) query[field].$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query[field].$lte = end;
    }
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
    
    // Status Distribution
    const statusStats = await Ticket.aggregate([
      { $match: matchStage },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Priority Distribution
    const priorityStats = await Ticket.aggregate([
      { $match: matchStage },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    
    // Category Distribution
    const categoryStats = await Ticket.aggregate([
      { $match: matchStage },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    // Avg Resolution Time (for resolved/closed tickets)
    // resolutionTime is difference between resolvedOn and createdAt in hours
    const resolutionStats = await Ticket.aggregate([
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

    const typeStats = await Asset.aggregate([
      { $match: matchStage },
      { $group: { _id: '$deviceType', count: { $sum: 1 } } }
    ]);
    
    const statusStats = await Asset.aggregate([
      { $match: matchStage },
      { $group: { _id: '$status', count: { $sum: 1 } } }
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

    // RMA by Status
    const statusStats = await RMARequest.aggregate([
      { $match: matchStage },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // RMA Trend (by month)
    const trendStats = await RMARequest.aggregate([
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
