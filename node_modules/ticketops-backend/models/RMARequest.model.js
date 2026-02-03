import mongoose from 'mongoose';

const rmaRequestSchema = new mongoose.Schema({
  rmaNumber: {
    type: String,
    unique: true,
    maxlength: 20
  },
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
  replacementSource: {
    type: String,
    enum: ['Market', 'SiteStock', 'HOStock', 'Repair'],
    default: 'Market'
  },
  reservedAssetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset'
  },
  // Link to stock transfer when using HO Stock
  stockTransferId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StockTransfer'
  },
  // Auto-transfer config: true if threshold met, false if manual approval needed
  isAutoTransfer: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: [
      'Requested', 'Approved', 'Ordered', 'Dispatched', 'Received',
      'Installed', 'Rejected', 'InRepair', 'Repaired',
      'TransferredToSiteStore', 'TransferredToHOStock', 'Discarded',
      // New statuses for HO Stock transfer workflow
      'AwaitingStockTransfer', 'StockInTransit', 'StockReceived',
      // New statuses for Repair-only flow
      'RepairedItemEnRoute', 'RepairedItemReceived'
    ],
    default: 'Requested'
  },
  // Complex Lifecycle Fields
  isSiteStockUsed: {
    type: Boolean,
    default: false
  },
  faultyItemAction: {
    type: String,
    enum: ['Repair', 'Discard', 'None'],
    default: 'None'
  },
  deliveredItemDestination: {
    type: String,
    enum: ['SiteInstalled', 'SiteStore', 'HOStock', 'None'],
    default: 'None'
  },
  repairedItemDestination: {
    type: String,
    enum: ['BackToSite', 'HOStock', 'OtherSite', 'None'],
    default: 'None'
  },
  // Override destination site (if repaired item is routed elsewhere with approval)
  overrideDestinationSiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site'
  },
  overrideApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  overrideReason: {
    type: String,
    maxlength: 500
  },
  // Repair vendor tracking
  repairVendor: {
    name: String,
    ticketNumber: String,
    contactPerson: String,
    contactPhone: String
  },
  repairDispatchDate: Date,
  repairReceivedDate: Date,
  installationStatus: {
    type: String,
    enum: ['Pending', 'Installed & Working', 'Installed but Not Working', 'Not Installed'],
    default: 'Pending'
  },
  isInstallationConfirmed: {
    type: Boolean,
    default: false
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
  installedOn: Date,
  isFaultyItemFinalized: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Pre-save hook to generate RMA number
rmaRequestSchema.pre('save', async function (next) {
  if (this.isNew && !this.rmaNumber) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    // Find the last RMA created today
    const lastRMA = await this.constructor.findOne({
      rmaNumber: new RegExp(`^RMA-${dateStr}-`)
    }).sort({ rmaNumber: -1 });

    let sequence = 1;
    if (lastRMA && lastRMA.rmaNumber) {
      const parts = lastRMA.rmaNumber.split('-');
      if (parts.length >= 3) {
        const lastSequence = parseInt(parts[2]);
        if (!isNaN(lastSequence)) {
          sequence = lastSequence + 1;
        }
      }
    }

    this.rmaNumber = `RMA-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }
  next();
});

// Indexes
rmaRequestSchema.index({ rmaNumber: 1 }, { unique: true });
rmaRequestSchema.index({ ticketId: 1 });
rmaRequestSchema.index({ siteId: 1 });
rmaRequestSchema.index({ originalAssetId: 1 });
rmaRequestSchema.index({ status: 1 });

export default mongoose.model('RMARequest', rmaRequestSchema);
