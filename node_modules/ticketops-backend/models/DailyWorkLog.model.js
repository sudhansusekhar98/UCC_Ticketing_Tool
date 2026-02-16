import mongoose from 'mongoose';

const ACTIVITY_CATEGORIES = [
    'Login',
    'TicketCreated', 'TicketUpdated', 'TicketResolved', 'TicketEscalated', 'TicketClosed',
    'TicketAssigned', 'TicketAcknowledged', 'TicketStarted', 'TicketVerified', 'TicketReopened',
    'AssetCreated', 'AssetUpdated', 'AssetImported', 'AssetDeleted',
    'StockAdded', 'StockTransferred', 'StockDeleted', 'RequisitionCreated',
    'RMACreated', 'RMAStatusChanged',
    'UserCreated', 'UserUpdated', 'UserDeleted',
    'NotificationCreated',
    'SiteCreated', 'SiteUpdated', 'SiteDeleted',
    'SiteVisit', 'AdminWork', 'Coordination', 'Training', 'Other'
];

const activityEntrySchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['auto', 'manual'],
        required: true
    },
    category: {
        type: String,
        enum: ACTIVITY_CATEGORIES,
        required: true
    },
    description: {
        type: String,
        required: true,
        maxlength: 1000
    },
    duration: {
        type: Number, // In minutes (for manual entries)
        min: 0
    },
    ticketRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket'
    },
    siteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Site'
    },
    refModel: {
        type: String,
        enum: ['Ticket', 'Asset', 'RMARequest', 'StockTransfer', 'Requisition', 'StockMovementLog', null]
    },
    refId: {
        type: mongoose.Schema.Types.ObjectId
    },
    attachments: [{
        url: { type: String },
        publicId: { type: String }
    }],
    metadata: {
        type: mongoose.Schema.Types.Mixed
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const dailyWorkLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    activities: [activityEntrySchema],
    dailySummary: {
        type: String,
        maxlength: 2000
    },
    stats: {
        ticketsCreated: { type: Number, default: 0 },
        ticketsUpdated: { type: Number, default: 0 },
        ticketsResolved: { type: Number, default: 0 },
        assetsAdded: { type: Number, default: 0 },
        assetsUpdated: { type: Number, default: 0 },
        assetsDeleted: { type: Number, default: 0 },
        stockMovements: { type: Number, default: 0 },
        rmaActions: { type: Number, default: 0 },
        usersManaged: { type: Number, default: 0 },
        notificationsCreated: { type: Number, default: 0 },
        sitesManaged: { type: Number, default: 0 },
        manualEntries: { type: Number, default: 0 }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound unique index: one document per user per day
dailyWorkLogSchema.index({ userId: 1, date: 1 }, { unique: true });
dailyWorkLogSchema.index({ date: -1 });

// Stat field mapping for category → stat key
const CATEGORY_STAT_MAP = {
    TicketCreated: 'ticketsCreated',
    TicketUpdated: 'ticketsUpdated',
    TicketResolved: 'ticketsResolved',
    TicketEscalated: 'ticketsUpdated',
    TicketClosed: 'ticketsUpdated',
    TicketAssigned: 'ticketsUpdated',
    TicketAcknowledged: 'ticketsUpdated',
    TicketStarted: 'ticketsUpdated',
    TicketVerified: 'ticketsUpdated',
    TicketReopened: 'ticketsUpdated',
    AssetCreated: 'assetsAdded',
    AssetUpdated: 'assetsUpdated',
    AssetImported: 'assetsAdded',
    AssetDeleted: 'assetsDeleted',
    StockAdded: 'stockMovements',
    StockTransferred: 'stockMovements',
    StockDeleted: 'stockMovements',
    RequisitionCreated: 'stockMovements',
    RMACreated: 'rmaActions',
    RMAStatusChanged: 'rmaActions',
    UserCreated: 'usersManaged',
    UserUpdated: 'usersManaged',
    UserDeleted: 'usersManaged',
    NotificationCreated: 'notificationsCreated',
    SiteCreated: 'sitesManaged',
    SiteUpdated: 'sitesManaged',
    SiteDeleted: 'sitesManaged',
    SiteVisit: 'manualEntries',
    AdminWork: 'manualEntries',
    Coordination: 'manualEntries',
    Training: 'manualEntries',
    Other: 'manualEntries'
};

/**
 * Static helper: log an activity for a user (fire-and-forget).
 * Creates the daily document if it doesn't exist yet.
 */
dailyWorkLogSchema.statics.logActivity = async function (userId, {
    category,
    description,
    refModel = null,
    refId = null,
    metadata = null,
    type = 'auto'
}) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const entry = {
            type,
            category,
            description,
            refModel,
            refId,
            metadata,
            timestamp: new Date()
        };

        // Build the $inc for stats
        const statKey = CATEGORY_STAT_MAP[category];
        const inc = statKey ? { [`stats.${statKey}`]: 1 } : {};

        await this.findOneAndUpdate(
            { userId, date: today },
            {
                $push: { activities: entry },
                $inc: inc,
                $setOnInsert: { userId, date: today }
            },
            { upsert: true, new: true }
        );

        // Also update User.lastActivityAt
        const User = mongoose.model('User');
        await User.findByIdAndUpdate(userId, { lastActivityAt: new Date() });
    } catch (err) {
        // Fire-and-forget — never crash the calling operation
        console.error('[WorkLog] Failed to log activity:', err.message);
    }
};

export { ACTIVITY_CATEGORIES, CATEGORY_STAT_MAP };
export default mongoose.model('DailyWorkLog', dailyWorkLogSchema);
