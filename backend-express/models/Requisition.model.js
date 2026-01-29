import mongoose from 'mongoose';

const requisitionSchema = new mongoose.Schema({
    ticketId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket',
        required: true
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
        enum: ['Pending', 'Approved', 'Fulfilled', 'Rejected', 'Cancelled'],
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
    comments: {
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
requisitionSchema.index({ ticketId: 1 });
requisitionSchema.index({ siteId: 1 });
requisitionSchema.index({ status: 1 });
requisitionSchema.index({ requestedBy: 1 });

export const RequisitionStatuses = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    FULFILLED: 'Fulfilled',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled'
};

export default mongoose.model('Requisition', requisitionSchema);
