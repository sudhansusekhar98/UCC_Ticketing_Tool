import mongoose from 'mongoose';
import Ticket from '../../models/Ticket.model.js';
import Asset from '../../models/Asset.model.js';

// @desc    Get dashboard stats - OPTIMIZED VERSION
// @route   GET /api/tickets/dashboard/stats
// @access  Private
export const getDashboardStatsOptimized = async (req, res, next) => {
    try {
        const user = req.user;
        let matchQuery = {};

        // Role-based filtering
        if (user.role !== 'Admin') {
            // Get site asset IDs once
            const siteAssetIds = await Asset.find({
                siteId: { $in: user.assignedSites || [] }
            }).distinct('_id').lean();

            matchQuery.$or = [
                { assignedTo: user._id },
                { createdBy: user._id },
                { assetId: { $in: siteAssetIds } }
            ];
        }

        // Single aggregation with facets for maximum performance
        const [stats] = await Ticket.aggregate([
            { $match: matchQuery },
            {
                $facet: {
                    // Status counts
                    statusCounts: [
                        {
                            $group: {
                                _id: '$status',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    // Priority breakdown (non-closed/cancelled)
                    priorityBreakdown: [
                        { $match: { status: { $nin: ['Closed', 'Cancelled'] } } },
                        {
                            $group: {
                                _id: '$priority',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    // Category breakdown (non-closed/cancelled)
                    categoryBreakdown: [
                        { $match: { status: { $nin: ['Closed', 'Cancelled'] } } },
                        {
                            $group: {
                                _id: '$category',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    // SLA stats
                    slaStats: [
                        {
                            $facet: {
                                breached: [
                                    {
                                        $match: {
                                            isSLARestoreBreached: true,
                                            status: { $nin: ['Closed', 'Cancelled'] }
                                        }
                                    },
                                    { $count: 'count' }
                                ],
                                atRisk: [
                                    {
                                        $match: {
                                            slaRestoreDue: { $lte: new Date(Date.now() + 30 * 60 * 1000) },
                                            status: { $nin: ['Closed', 'Cancelled', 'Resolved'] }
                                        }
                                    },
                                    { $count: 'count' }
                                ],
                                // SLA compliance: actual timestamp comparison, not the flag
                                // Only tickets that have an SLA deadline set are counted (avoids pre-fix tickets skewing %)
                                closedCompliant: [
                                    {
                                        $match: {
                                            status: { $in: ['Closed', 'Resolved'] },
                                            slaRestoreDue: { $exists: true, $ne: null },
                                            $expr: {
                                                $lte: [
                                                    { $ifNull: ['$resolvedOn', '$closedOn'] },
                                                    '$slaRestoreDue'
                                                ]
                                            }
                                        }
                                    },
                                    { $count: 'count' }
                                ],
                                // Denominator: only tickets that have an SLA deadline (excludes pre-fix legacy tickets)
                                totalClosedWithSLA: [
                                    {
                                        $match: {
                                            status: { $in: ['Closed', 'Resolved'] },
                                            slaRestoreDue: { $exists: true, $ne: null }
                                        }
                                    },
                                    { $count: 'count' }
                                ]
                            }
                        }
                    ],
                    // Critical priority OR SLA-breached active tickets
                    criticalOrBreached: [
                        {
                            $match: {
                                status: { $nin: ['Closed', 'Cancelled'] },
                                $or: [
                                    { priority: 'Critical' },
                                    { isSLARestoreBreached: true }
                                ]
                            }
                        },
                        { $count: 'count' }
                    ],
                    // Escalated count
                    escalatedCount: [
                        { $match: { status: 'Escalated' } },
                        { $count: 'count' }
                    ],
                    // Resolved today
                    resolvedToday: [
                        {
                            $match: {
                                resolvedOn: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                            }
                        },
                        { $count: 'count' }
                    ],
                    // Total count
                    totalCount: [
                        { $count: 'count' }
                    ]
                }
            }
        ]);

        // Get asset counts in parallel
        const assetMatchQuery = user.role === 'Admin'
            ? {}
            : { siteId: { $in: (user.assignedSites || []).map(s => new mongoose.Types.ObjectId(s)) } };
        const [totalAssets, offlineAssets] = await Promise.all([
            Asset.countDocuments(assetMatchQuery),
            Asset.countDocuments({ ...assetMatchQuery, status: 'Offline' })
        ]);

        // Process results
        const statusCounts = {};
        stats.statusCounts.forEach(item => {
            statusCounts[item._id] = item.count;
        });

        const slaBreached = stats.slaStats[0].breached[0]?.count || 0;
        const slaAtRisk = stats.slaStats[0].atRisk[0]?.count || 0;
        const closedWithSLA = stats.slaStats[0].closedCompliant[0]?.count || 0;
        const totalClosedForSLA = stats.slaStats[0].totalClosedWithSLA[0]?.count || 0;
        const criticalTickets = stats.criticalOrBreached[0]?.count || 0;
        // Return null when no tickets have SLA dates yet - avoids showing 100% on a blank slate
        const slaCompliancePercent = totalClosedForSLA > 0
            ? Math.round((closedWithSLA / totalClosedForSLA) * 100)
            : null;

        const ticketsByPriority = stats.priorityBreakdown.map(item => ({
            priority: item._id,
            count: item.count
        }));

        const ticketsByStatus = stats.statusCounts.map(item => ({
            status: item._id,
            count: item.count
        }));

        const ticketsByCategory = stats.categoryBreakdown.map(item => ({
            category: item._id || 'Uncategorized',
            count: item.count
        }));

        const totalEscalated = stats.escalatedCount[0]?.count || 0;
        const resolvedToday = stats.resolvedToday[0]?.count || 0;
        const totalTickets = stats.totalCount[0]?.count || 0;

        res.json({
            success: true,
            data: {
                // Main stats
                // Open = unacknowledged tickets (Open + Assigned statuses)
                openTickets: (statusCounts['Open'] || 0) + (statusCounts['Assigned'] || 0),
                inProgressTickets: statusCounts['InProgress'] || 0,
                escalatedTickets: totalEscalated,
                criticalTickets,
                slaBreached,
                slaAtRisk,
                slaCompliancePercent,
                totalTickets,
                resolvedToday,

                // Asset stats
                totalAssets,
                offlineAssets,

                // Available engineers (placeholder)
                availableEngineers: 0,

                // Charts data
                ticketsByPriority,
                ticketsByStatus,
                ticketsByCategory,

                // Legacy fields for compatibility
                totalOpen: statusCounts['Open'] || 0,
                totalAssigned: statusCounts['Assigned'] || 0,
                totalInProgress: statusCounts['InProgress'] || 0,
                totalResolved: statusCounts['Resolved'] || 0,
                totalClosed: statusCounts['Closed'] || 0,
                totalEscalated
            }
        });
    } catch (error) {
        next(error);
    }
};

export default getDashboardStatsOptimized;

// @desc    Get daily ticket trend data for analytics dashboard
// @route   GET /api/tickets/dashboard/trends
// @access  Private
export const getTicketTrends = async (req, res, next) => {
    try {
        const user = req.user;
        const { startDate, endDate, siteId } = req.query;

        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        end.setHours(23, 59, 59, 999);
        start.setHours(0, 0, 0, 0);

        const rangeMs = end - start;
        const prevEnd = new Date(start.getTime() - 1);
        const prevStart = new Date(start.getTime() - rangeMs - 1);

        // Role-based site filter (same pattern as getDashboardStatsOptimized)
        let baseMatch = {};
        if (user.role !== 'Admin') {
            const siteFilter = siteId
                ? [new mongoose.Types.ObjectId(siteId)]
                : (user.assignedSites || []).map(s => new mongoose.Types.ObjectId(s));
            const siteAssetIds = await Asset.find({ siteId: { $in: siteFilter } }).distinct('_id').lean();
            baseMatch.$or = [
                { assignedTo: user._id },
                { createdBy: user._id },
                { assetId: { $in: siteAssetIds } }
            ];
        } else if (siteId) {
            const siteAssetIds = await Asset.find({ siteId: new mongoose.Types.ObjectId(siteId) }).distinct('_id').lean();
            baseMatch.assetId = { $in: siteAssetIds };
        }

        // Daily created counts for current range
        const createdTrends = await Ticket.aggregate([
            { $match: { ...baseMatch, createdAt: { $gte: start, $lte: end } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
        ]);

        // Daily resolved counts for current range (only tickets with a resolvedOn date)
        const resolvedTrends = await Ticket.aggregate([
            { $match: { ...baseMatch, resolvedOn: { $ne: null, $gte: start, $lte: end } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$resolvedOn' } }, count: { $sum: 1 } } }
        ]);

        // Merge into unified trends array keyed by date
        const trendMap = {};
        createdTrends.forEach(d => {
            trendMap[d._id] = { date: d._id, created: d.count, resolved: 0 };
        });
        resolvedTrends.forEach(d => {
            if (trendMap[d._id]) trendMap[d._id].resolved = d.count;
            else trendMap[d._id] = { date: d._id, created: 0, resolved: d.count };
        });
        const trends = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

        // Current period stats — all three use the same date bounds for coherent deltas
        const [currentTotal, currentResolved, currentOpen] = await Promise.all([
            Ticket.countDocuments({ ...baseMatch, createdAt: { $gte: start, $lte: end } }),
            Ticket.countDocuments({ ...baseMatch, resolvedOn: { $ne: null, $gte: start, $lte: end } }),
            Ticket.countDocuments({
                ...baseMatch,
                createdAt: { $gte: start, $lte: end },
                status: { $nin: ['Closed', 'Cancelled', 'Resolved'] }
            })
        ]);

        // Previous period stats — same structure as current period
        const [prevTotal, prevResolved, prevOpen] = await Promise.all([
            Ticket.countDocuments({ ...baseMatch, createdAt: { $gte: prevStart, $lte: prevEnd } }),
            Ticket.countDocuments({ ...baseMatch, resolvedOn: { $ne: null, $gte: prevStart, $lte: prevEnd } }),
            Ticket.countDocuments({
                ...baseMatch,
                createdAt: { $gte: prevStart, $lte: prevEnd },
                status: { $nin: ['Closed', 'Cancelled', 'Resolved'] }
            })
        ]);

        res.json({
            success: true,
            data: {
                trends,
                currentStats: {
                    totalCreated: currentTotal,
                    totalResolved: currentResolved,
                    openTickets: currentOpen
                },
                previousStats: {
                    totalCreated: prevTotal,
                    totalResolved: prevResolved,
                    openTickets: prevOpen
                }
            }
        });
    } catch (error) {
        next(error);
    }
};
