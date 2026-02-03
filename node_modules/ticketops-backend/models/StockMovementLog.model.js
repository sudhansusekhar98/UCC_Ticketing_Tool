import mongoose from 'mongoose';

const stockMovementLogSchema = new mongoose.Schema({
    // Asset being moved/added
    assetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset',
        required: true
    },
    // Movement type
    movementType: {
        type: String,
        enum: [
            'Added',           // New stock added to inventory
            'Transfer',        // Transfer between sites
            'RMATransfer',     // RMA-related transfer from HO to Site
            'RepairedReturn',  // Repaired item returning
            'StatusChange',    // Status change (e.g., Spare -> Operational)
            'Reserved',        // Reserved for RMA
            'Released',        // Released from reservation
            'Disposed'         // Marked as damaged/disposed
        ],
        required: true
    },
    // Source location (null for new additions)
    fromSiteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Site'
    },
    // Destination location
    toSiteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Site'
    },
    // Status change tracking
    fromStatus: {
        type: String,
        maxlength: 50
    },
    toStatus: {
        type: String,
        maxlength: 50
    },
    // User who performed the action
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Reference to related entities
    rmaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RMARequest'
    },
    requisitionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Requisition'
    },
    stockTransferId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StockTransfer'
    },
    ticketId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket'
    },
    // Additional notes
    notes: {
        type: String,
        maxlength: 500,
        trim: true
    },
    // Asset snapshot at time of movement
    assetSnapshot: {
        assetCode: String,
        assetType: String,
        serialNumber: String,
        mac: String,
        make: String,
        model: String
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
stockMovementLogSchema.index({ assetId: 1, createdAt: -1 });
stockMovementLogSchema.index({ toSiteId: 1, createdAt: -1 });
stockMovementLogSchema.index({ fromSiteId: 1, createdAt: -1 });
stockMovementLogSchema.index({ movementType: 1, createdAt: -1 });
stockMovementLogSchema.index({ rmaId: 1 });
stockMovementLogSchema.index({ requisitionId: 1 });
stockMovementLogSchema.index({ createdAt: -1 });

// Static helper to create a log entry
stockMovementLogSchema.statics.logMovement = async function (data) {
    const {
        asset,
        movementType,
        fromSiteId,
        toSiteId,
        fromStatus,
        toStatus,
        performedBy,
        rmaId,
        requisitionId,
        stockTransferId,
        ticketId,
        notes
    } = data;

    return this.create({
        assetId: asset._id,
        movementType,
        fromSiteId,
        toSiteId,
        fromStatus,
        toStatus,
        performedBy,
        rmaId,
        requisitionId,
        stockTransferId,
        ticketId,
        notes,
        assetSnapshot: {
            assetCode: asset.assetCode,
            assetType: asset.assetType,
            serialNumber: asset.serialNumber,
            mac: asset.mac,
            make: asset.make,
            model: asset.model
        }
    });
};

export const MovementTypes = {
    ADDED: 'Added',
    TRANSFER: 'Transfer',
    RMA_TRANSFER: 'RMATransfer',
    REPAIRED_RETURN: 'RepairedReturn',
    STATUS_CHANGE: 'StatusChange',
    RESERVED: 'Reserved',
    RELEASED: 'Released',
    DISPOSED: 'Disposed'
};

export default mongoose.model('StockMovementLog', stockMovementLogSchema);
