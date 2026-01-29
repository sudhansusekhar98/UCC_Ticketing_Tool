import mongoose from 'mongoose';

const stockReplacementSchema = new mongoose.Schema({
    ticketId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket',
        required: true
    },
    assetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset',
        required: true
    },
    // Details of the OLD hardware (before replacement)
    oldDetails: {
        serialNumber: String,
        mac: String,
        ipAddress: String,
        make: String,
        model: String
    },
    // Details of the NEW hardware (from stock)
    newDetails: {
        serialNumber: String,
        mac: String,
        ipAddress: String,
        make: String,
        model: String
    },
    replacedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    replacedOn: {
        type: Date,
        default: Date.now
    },
    remarks: String
}, {
    timestamps: true
});

// Indexes
stockReplacementSchema.index({ ticketId: 1 });
stockReplacementSchema.index({ assetId: 1 });

export default mongoose.model('StockReplacement', stockReplacementSchema);
