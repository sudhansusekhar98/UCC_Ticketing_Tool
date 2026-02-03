import mongoose from 'mongoose';

const requisitionSchema = new mongoose.Schema({
    // Auto-generated requisition number
    requisitionNumber: {
        type: String,
        unique: true,
        maxlength: 20
    },
    ticketId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket',
        required: function () {
            // ticketId is required for StockRequest type, optional for others
            return this.requisitionType === 'StockRequest';
        }
    },
    // RMA reference for RMA-based requisitions
    rmaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RMARequest'
    },
    // Requisition type to distinguish between different workflows
    requisitionType: {
        type: String,
        enum: [
            'StockRequest',          // Original ticket-based stock request
            'RMATransfer',           // HO stock transfer for RMA replacement
            'RepairedItemTransfer'   // Repaired item being moved to HO/site
        ],
        default: 'StockRequest'
    },
    // Transfer direction for RMA-based transfers
    transferDirection: {
        type: String,
        enum: ['ToSite', 'ToHO', 'SiteToSite', 'None'],
        default: 'None'
    },
    siteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Site',
        required: true
    },
    sourceSiteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Site',
        required: true
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Specific asset being transferred (for RMA flows)
    assetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset'
    },
    assetType: {
        type: String,
        required: true,
        maxlength: 100
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'InTransit', 'Fulfilled', 'Rejected', 'Cancelled'],
        default: 'Pending'
    },
    fulfilledAssetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedOn: Date,
    fulfilledOn: Date,
    dispatchedOn: Date,
    receivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    comments: {
        type: String,
        maxlength: 500
    },
    rejectionReason: {
        type: String,
        maxlength: 500
    },
    // Link to associated stock transfer if created
    stockTransferId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StockTransfer'
    }
}, {
    timestamps: true
});

// Pre-save hook to generate requisition number
requisitionSchema.pre('save', async function (next) {
    if (this.isNew && !this.requisitionNumber) {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

        // Determine prefix based on type
        let prefix = 'REQ';
        if (this.requisitionType === 'RMATransfer') prefix = 'RMT';
        else if (this.requisitionType === 'RepairedItemTransfer') prefix = 'RPT';

        // Find the last requisition created today with same prefix
        const lastReq = await this.constructor.findOne({
            requisitionNumber: new RegExp(`^${prefix}-${dateStr}-`)
        }).sort({ requisitionNumber: -1 });

        let sequence = 1;
        if (lastReq && lastReq.requisitionNumber) {
            const parts = lastReq.requisitionNumber.split('-');
            if (parts.length >= 3) {
                const lastSequence = parseInt(parts[2]);
                if (!isNaN(lastSequence)) {
                    sequence = lastSequence + 1;
                }
            }
        }

        this.requisitionNumber = `${prefix}-${dateStr}-${sequence.toString().padStart(4, '0')}`;
    }
    next();
});

// Indexes
requisitionSchema.index({ requisitionNumber: 1 }, { unique: true });
requisitionSchema.index({ ticketId: 1 });
requisitionSchema.index({ rmaId: 1 });
requisitionSchema.index({ siteId: 1 });
requisitionSchema.index({ status: 1 });
requisitionSchema.index({ requestedBy: 1 });
requisitionSchema.index({ requisitionType: 1 });

export const RequisitionStatuses = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    IN_TRANSIT: 'InTransit',
    FULFILLED: 'Fulfilled',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled'
};

export const RequisitionTypes = {
    STOCK_REQUEST: 'StockRequest',
    RMA_TRANSFER: 'RMATransfer',
    REPAIRED_ITEM_TRANSFER: 'RepairedItemTransfer'
};

export default mongoose.model('Requisition', requisitionSchema);
