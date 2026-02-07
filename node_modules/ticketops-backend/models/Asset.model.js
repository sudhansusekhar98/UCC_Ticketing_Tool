import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  assetCode: {
    type: String,
    required: [true, 'Asset code is required'],
    maxlength: 50,
    trim: true
  },
  assetType: {
    type: String,
    required: [true, 'Asset type is required'],
    maxlength: 50,
    trim: true
  },
  serialNumber: {
    type: String,
    maxlength: 100,
    trim: true
  },
  mac: {
    type: String,
    maxlength: 50,
    trim: true
  },
  ipAddress: {
    type: String,
    maxlength: 50,
    trim: true
  },
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: [true, 'Site ID is required']
  },
  locationDescription: {
    type: String,
    maxlength: 200,
    trim: true
  },
  criticality: {
    type: Number,
    required: true,
    enum: [1, 2, 3], // 1 = Low, 2 = Medium, 3 = High
    default: 2
  },
  status: {
    type: String,
    enum: ['Operational', 'Degraded', 'Offline', 'Maintenance', 'In Repair', 'Not Installed', 'Spare', 'InTransit', 'Damaged', 'Reserved', 'Online', 'Passive Device'],
    default: 'Operational'
  },
  reservedByRma: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RMARequest'
  },
  stockLocation: {
    type: String,
    maxlength: 100,
    trim: true
  },
  installationDate: {
    type: Date
  },
  warrantyEndDate: {
    type: Date
  },
  vmsReferenceId: {
    type: String,
    maxlength: 100,
    trim: true
  },
  nmsReferenceId: {
    type: String,
    maxlength: 100,
    trim: true
  },
  // Additional fields
  make: {
    type: String,
    maxlength: 100,
    trim: true
  },
  model: {
    type: String,
    maxlength: 150,
    trim: true
  },
  locationName: {
    type: String,
    maxlength: 150,
    trim: true
  },
  deviceType: {
    type: String,
    maxlength: 100,
    trim: true
  },
  usedFor: {
    type: String,
    maxlength: 150,
    trim: true
  },
  userName: {
    type: String,
    maxlength: 100,
    trim: true
  },
  password: {
    type: String,
    maxlength: 255
    // Note: This is device/asset password, not user credentials - acceptable for all users to see
  },
  remark: {
    type: String,
    maxlength: 500,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes (assetCode index is already created via unique: true)
assetSchema.index({ assetType: 1 });
assetSchema.index({ siteId: 1 });
assetSchema.index({ status: 1 });
assetSchema.index({ isActive: 1 });

// Virtual for tickets
assetSchema.virtual('tickets', {
  ref: 'Ticket',
  localField: '_id',
  foreignField: 'assetId'
});

// Constants
export const AssetTypes = {
  CAMERA: 'Camera',
  NVR: 'NVR',
  SWITCH: 'Switch',
  ROUTER: 'Router',
  SERVER: 'Server',
  OTHER: 'Other'
};

export const AssetStatuses = {
  OPERATIONAL: 'Operational',
  DEGRADED: 'Degraded',
  OFFLINE: 'Offline',
  MAINTENANCE: 'Maintenance',
  NOT_INSTALLED: 'Not Installed',
  SPARE: 'Spare',
  IN_TRANSIT: 'InTransit',
  DAMAGED: 'Damaged',
  RESERVED: 'Reserved',
  IN_REPAIR: 'In Repair',
  ONLINE: 'Online',
  PASSIVE_DEVICE: 'Passive Device'
};

export default mongoose.model('Asset', assetSchema);
