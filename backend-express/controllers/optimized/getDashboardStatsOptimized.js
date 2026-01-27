import mongoose from 'mongoose';
import Ticket from '../models/Ticket.model.js';
import Asset from '../models/Asset.model.js';

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
                                closedCompliant: [
                                    {
                                        $match: {
                                            status: 'Closed',
                                            isSLARestoreBreached: false
                                        }
                                    },
                                    { $count: 'count' }
                                ],
                                totalClosed: [
                                    {
                                        $match: {
                                            status: 'Closed'
                                        }
                                    },
                                    { $count: 'count' }
                                ]
                            }
                        }
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
        const totalClosedForSLA = stats.slaStats[0].totalClosed[0]?.count || 0;
        const slaCompliancePercent = totalClosedForSLA > 0
            ? Math.round((closedWithSLA / totalClosedForSLA) * 100)
            : 100;

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
                openTickets: statusCounts['Open'] || 0,
                inProgressTickets: statusCounts['InProgress'] || 0,
                escalatedTickets: totalEscalated,
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
