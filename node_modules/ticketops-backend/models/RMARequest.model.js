import mongoose from 'mongoose';

const rmaRequestSchema = new mongoose.Schema({
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
  originalAssetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true
  },
  // Snapshot of the asset details BEFORE replacement (for history)
  originalDetailsSnapshot: {
    serialNumber: String,
    ipAddress: String,
    mac: String,
    model: String,
    make: String
  },
  // Details of the new device replacing the old one
  replacementDetails: {
    serialNumber: String,
    ipAddress: String,
    mac: String,
    model: String,
    make: String,
    // Add other fields that might change
  },
  status: {
    type: String,
    enum: ['Requested', 'Approved', 'Ordered', 'Dispatched', 'Received', 'Installed', 'Rejected'],
    default: 'Requested'
  },
  requestReason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  // Shipping / Vendor Details
  shippingDetails: {
    address: String,
    trackingNumber: String,
    carrier: String,
    estimatedDelivery: Date
  },
  vendorDetails: {
    vendorName: String,
    orderId: String,
    cost: Number,
    currency: {
      type: String,
      default: 'INR'
    }
  },
  // Audit Trail
  timeline: [{
    status: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedOn: {
      type: Date,
      default: Date.now
    },
    remarks: String
  }],
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedOn: Date,
  installedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  installedOn: Date
}, {
  timestamps: true
});

// Indexes
rmaRequestSchema.index({ ticketId: 1 });
rmaRequestSchema.index({ siteId: 1 });
rmaRequestSchema.index({ originalAssetId: 1 });
rmaRequestSchema.index({ status: 1 });

export default mongoose.model('RMARequest', rmaRequestSchema);
