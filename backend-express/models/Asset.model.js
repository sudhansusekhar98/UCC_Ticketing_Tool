import mongoose from 'mongoose';
import { encrypt, decrypt, isEncrypted, SENSITIVE_ASSET_FIELDS } from '../utils/encryption.utils.js';

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
    maxlength: 1024 // Increased to accommodate encrypted ciphertext
    // Note: Device/asset password - encrypted at rest
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

// ============================================================================
// Mongoose Middleware: Encrypt sensitive fields before save
// ============================================================================
assetSchema.pre('save', function (next) {
  try {
    for (const field of SENSITIVE_ASSET_FIELDS) {
      if (this.isModified(field) && this[field] && !isEncrypted(this[field])) {
        this[field] = encrypt(this[field]);
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Encrypt on findOneAndUpdate / updateOne
assetSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
  try {
    const update = this.getUpdate();
    if (!update) return next();

    // Handle $set operator
    const target = update.$set || update;
    for (const field of SENSITIVE_ASSET_FIELDS) {
      if (target[field] && !isEncrypted(target[field])) {
        target[field] = encrypt(target[field]);
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Static method: Decrypt sensitive fields on a document
// Only call this when the requesting user is authorized.
// ============================================================================
assetSchema.statics.decryptSensitiveFields = function (doc) {
  if (!doc) return doc;

  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  for (const field of SENSITIVE_ASSET_FIELDS) {
    if (obj[field] && isEncrypted(obj[field])) {
      try {
        obj[field] = decrypt(obj[field]);
      } catch (err) {
        console.error(`[DECRYPT_ERROR] Failed to decrypt ${field}:`, err.message);
        obj[field] = '[ENCRYPTED]';
      }
    }
  }
  return obj;
};

// ============================================================================
// Static method: Mask sensitive fields for non-privileged users
// ============================================================================
assetSchema.statics.maskSensitiveFields = function (doc) {
  if (!doc) return doc;

  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  for (const field of SENSITIVE_ASSET_FIELDS) {
    if (obj[field]) {
      if (field === 'password') {
        obj[field] = '••••••••';
      } else {
        obj[field] = '●●●●●●';
      }
    }
  }
  return obj;
};

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
