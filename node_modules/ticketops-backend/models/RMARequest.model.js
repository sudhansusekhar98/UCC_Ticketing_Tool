import mongoose from 'mongoose';

const rmaRequestSchema = new mongoose.Schema({
  rmaNumber: {
    type: String,
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
    assetCode: String,
    serialNumber: String,
    ipAddress: String,
    mac: String,
    model: String,
    make: String
  },
  // Details of the new device replacing the old one
  replacementDetails: {
    assetCode: String,
    serialNumber: String,
    ipAddress: String,
    mac: String,
    model: String,
    make: String,
  },
  // ---- NEW SIMPLIFIED WORKFLOW ----
  // Two options: 'RepairOnly' or 'RepairAndReplace'
  // Legacy values ('Market', 'SiteStock', 'HOStock', 'Repair') are still accepted for backward compat
  replacementSource: {
    type: String,
    enum: ['Market', 'SiteStock', 'HOStock', 'Repair', 'RepairOnly', 'RepairAndReplace'],
    default: 'RepairOnly'
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
  // ---- Replacement Stock Workflow (Admin/Escalation scope) ----
  // Admin selects the actual stock source when replacement is needed
  replacementStockSource: {
    type: String,
    enum: ['HOStock', 'SiteStock', 'Market', null],
    default: null
  },
  // Source site for the replacement stock (if SiteStock from another site)
  replacementSourceSiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site'
  },
  // Link to requisition raised by Admin for replacement
  replacementRequisitionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Requisition'
  },
  // Logistics for replacement dispatch to site
  logisticsReplacementToSite: {
    carrier: String,
    trackingNumber: String,
    courierName: String,
    dispatchDate: Date,
    receivedDate: Date,
    remarks: String
  },
  // Admin who arranged the replacement
  replacementArrangedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  replacementArrangedOn: Date,
  status: {
    type: String,
    enum: [
      // Core lifecycle
      'Requested', 'Approved', 'Rejected',
      // Repair path - item sent from site
      'SentToServiceCenter',   // L1 sends directly to service center
      'SentToHO',              // L1 sends item to HO first
      'ReceivedAtHO',          // Admin acknowledges receipt at HO
      'SentForRepairFromHO',   // Admin sends item from HO to service center
      // Repair completed
      'ItemRepairedAtHO',      // Repaired item received back at HO (Admin confirms Yes)
      'ReturnShippedToSite',   // Admin ships repaired/replacement item back to site
      'ReceivedAtSite',        // User/L1 marks received at site
      'Installed',             // User marks as installed with updated details
      // Replacement stock workflow (Admin/Escalation scope)
      'ReplacementRequisitionRaised',  // Admin raises requisition for stock transfer
      'ReplacementDispatched',         // Replacement stock dispatched to site
      'ReplacementReceivedAtSite',     // L1/ticket owner confirms replacement received
      // Legacy statuses (kept for backward compatibility)
      'Ordered', 'Dispatched', 'Received',
      'InRepair', 'Repaired',
      'TransferredToSiteStore', 'TransferredToHOStock', 'Discarded',
      'AwaitingStockTransfer', 'StockInTransit', 'StockReceived',
      'RepairedItemEnRoute', 'RepairedItemReceived'
    ],
    default: 'Requested'
  },
  // === PARALLEL TRACK STATUSES ===
  // Repair track: tracks the faulty item through repair and return
  repairTrackStatus: {
    type: String,
    enum: [
      'Pending',               // Not started yet (RMA approved but item not sent)
      'SentToHO',              // Sent to HO
      'SentToServiceCenter',   // Sent directly to SC
      'ReceivedAtHO',          // Received at HO
      'SentForRepair',         // Forwarded from HO to SC
      'Repaired',              // Repaired item received back at HO
      'ReturnShipped',         // Shipped back to site
      'ReturnReceived',        // Received at destination site
      'Installed',             // Installed at site
      'CompletedToHOStock',    // Sent to HO stock (no installation)
      null
    ],
    default: null
  },
  // Replacement track: tracks the replacement device sourcing and delivery
  replacementTrackStatus: {
    type: String,
    enum: [
      'NotRequired',           // RepairOnly — no replacement needed
      'Pending',               // RepairAndReplace approved but not yet started
      'RequisitionRaised',     // Admin raised requisition
      'Dispatched',            // Replacement dispatched to site
      'Received',              // Received at site
      'Installed',             // Installed
      null
    ],
    default: null
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
  // ---- NEW: Logistics tracking for the new workflow ----
  // Where the L1 sends the item: 'DirectToServiceCenter' or 'ToHO'
  itemSendRoute: {
    type: String,
    enum: ['DirectToServiceCenter', 'ToHO', null],
    default: null
  },
  // Logistics details for each shipping leg
  logisticsToHO: {
    carrier: String,
    trackingNumber: String,
    courierName: String,
    dispatchDate: Date,
    receivedDate: Date,
    remarks: String
  },
  logisticsToServiceCenter: {
    carrier: String,
    trackingNumber: String,
    courierName: String,
    dispatchDate: Date,
    serviceCenterTicketRef: String,  // Reference ticket from service center (out of scope)
    remarks: String
  },
  logisticsReturnToSite: {
    carrier: String,
    trackingNumber: String,
    courierName: String,
    dispatchDate: Date,
    receivedDate: Date,
    remarks: String
  },
  // Admin confirmation at HO
  receivedAtHOBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  receivedAtHODate: Date,
  // Repaired item receipt confirmation
  repairedItemReceivedAtHO: {
    type: Boolean,
    default: false
  },
  repairedItemReceivedAtHOBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  repairedItemReceivedAtHODate: Date,
  // ---- END NEW FIELDS ----
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
