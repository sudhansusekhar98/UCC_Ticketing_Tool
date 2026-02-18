import mongoose from 'mongoose';

const stockTransferSchema = new mongoose.Schema({
    transferName: {
        type: String,
        maxlength: 200,
        trim: true
    },
    sourceSiteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Site',
        required: true
    },
    destinationSiteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Site',
        required: true
    },
    assetIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset'
    }],
    initiatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'InTransit', 'Dispatched', 'Completed', 'Rejected', 'Cancelled'],
        default: 'Pending'
    },
    // Shipping / logistics details (filled at dispatch)
    shippingDetails: {
        carrier: { type: String, maxlength: 200, trim: true },
        trackingNumber: { type: String, maxlength: 200, trim: true },
        courierName: { type: String, maxlength: 200, trim: true },
        remarks: { type: String, maxlength: 500, trim: true },
        dispatchDate: Date
    },
    transferDate: Date,
    receivedDate: Date,
    receivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Link to ticket (optional — populated when selected in RMA)
    linkedTicketId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket'
    },
    notes: {
        type: String,
        maxlength: 500
    },
    rejectionReason: {
        type: String,
        maxlength: 500
    }
}, {
    timestamps: true
});

// Indexes
stockTransferSchema.index({ sourceSiteId: 1 });
stockTransferSchema.index({ destinationSiteId: 1 });
stockTransferSchema.index({ status: 1 });
stockTransferSchema.index({ initiatedBy: 1 });

export const TransferStatuses = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    IN_TRANSIT: 'InTransit',
    DISPATCHED: 'Dispatched',
    COMPLETED: 'Completed',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled'
};

export default mongoose.model('StockTransfer', stockTransferSchema);
