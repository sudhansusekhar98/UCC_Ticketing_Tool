import mongoose from 'mongoose';

const assetUpdateRequestSchema = new mongoose.Schema({
  rmaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RMARequest',
    required: true
  },
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
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  // Proposed changes to the asset
  proposedChanges: {
    serialNumber: String,
    ipAddress: String,
    mac: String,
    model: String,
    make: String,
    locationName: String,
    locationDescription: String,
    userName: String,
    password: String,
    remark: String,
    // Add any other fields that can be updated
  },
  // Original values before change (for reference)
  originalValues: {
    serialNumber: String,
    ipAddress: String,
    mac: String,
    model: String,
    make: String,
    locationName: String,
    locationDescription: String,
    userName: String,
    remark: String,
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Expired'],
    default: 'Pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: String,
  // Temporary access
  accessToken: {
    type: String,
    required: true,
    unique: true
  },
  accessExpiresAt: {
    type: Date,
    required: true
  },
  submittedAt: Date,
}, {
  timestamps: true
});

// Indexes
assetUpdateRequestSchema.index({ ticketId: 1 });
assetUpdateRequestSchema.index({ assetId: 1 });
assetUpdateRequestSchema.index({ rmaId: 1 });
assetUpdateRequestSchema.index({ accessToken: 1 });
assetUpdateRequestSchema.index({ status: 1 });
assetUpdateRequestSchema.index({ accessExpiresAt: 1 });

// Method to check if access is still valid
assetUpdateRequestSchema.methods.isAccessValid = function() {
  return this.status === 'Pending' && this.accessExpiresAt > new Date() && !this.submittedAt;
};

export default mongoose.model('AssetUpdateRequest', assetUpdateRequestSchema);
