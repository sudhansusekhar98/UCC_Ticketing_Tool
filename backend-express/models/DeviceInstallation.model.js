import mongoose from 'mongoose';

const deviceInstallationSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required']
  },
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectZone'
  },

  // Device Details
  assetType: {
    type: String,
    maxlength: 100,
    trim: true
  },
  deviceType: {
    type: String,
    required: [true, 'Device type is required'],
    maxlength: 100,
    trim: true
  },
  make: {
    type: String,
    maxlength: 100,
    trim: true
  },
  model: {
    type: String,
    maxlength: 100,
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
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },

  // Installation Location
  installationLocation: {
    zoneName: {
      type: String,
      maxlength: 100
    },
    poleWallId: {
      type: String,
      maxlength: 50
    },
    floorLevel: {
      type: String,
      maxlength: 50
    },
    description: {
      type: String,
      maxlength: 200
    },
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    }
  },

  // Installation Status
  status: {
    type: String,
    enum: ['Pending', 'Installed', 'Configured', 'Tested', 'Deployed', 'Faulty', 'Replaced'],
    default: 'Pending'
  },

  // Cable Details (for cable type devices)
  cableDetails: {
    lengthMeters: {
      type: Number,
      min: 0
    },
    cableType: {
      type: String,
      enum: ['CAT5', 'CAT6', 'CAT6A', 'Fiber', 'Coaxial', 'Power', 'Other']
    },
    trenchId: {
      type: String,
      maxlength: 50
    }
  },

  // Network Details (for network devices)
  networkDetails: {
    ipAddress: {
      type: String,
      maxlength: 50
    },
    macAddress: {
      type: String,
      maxlength: 20
    },
    nvrChannel: {
      type: Number,
      min: 1
    },
    subnet: {
      type: String,
      maxlength: 50
    },
    gateway: {
      type: String,
      maxlength: 50
    },
    vlanId: {
      type: String,
      maxlength: 20
    }
  },

  // Camera-specific details
  cameraDetails: {
    resolution: {
      type: String,
      maxlength: 20
    },
    fieldOfView: {
      type: String,
      maxlength: 20
    },
    nightVision: {
      type: Boolean,
      default: false
    },
    ptzCapable: {
      type: Boolean,
      default: false
    }
  },

  // Installation Info
  installedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  installedAt: {
    type: Date
  },
  testedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  testedAt: {
    type: Date
  },

  // Assignment for Configuration/Testing
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: {
    type: Date
  },

  // Configuration requirement (non-IT/passive items may skip)
  requiresConfiguration: {
    type: Boolean,
    default: true
  },
  configurationSkippedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  configurationSkippedAt: {
    type: Date
  },
  configurationSkipReason: {
    type: String,
    maxlength: 200
  },

  // Photo documentation
  photos: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String
    },
    caption: {
      type: String,
      maxlength: 200
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Notes
  notes: {
    type: String,
    maxlength: 1000
  },

  // Linked to daily log (if created through daily log)
  linkedDailyLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PMDailyLog'
  },

  // Linked to project stock allocation (if sourced from allocated stock)
  allocationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectStockAllocation'
  },

  // Linked to cable allocation (for tracking cable usage per device)
  cableAllocationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectStockAllocation'
  },

  // Track if device was converted to an operational asset
  convertedToAsset: {
    type: Boolean,
    default: false
  },
  convertedAssetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
deviceInstallationSchema.index({ projectId: 1 });
deviceInstallationSchema.index({ zoneId: 1 });
deviceInstallationSchema.index({ deviceType: 1 });
deviceInstallationSchema.index({ status: 1 });
deviceInstallationSchema.index({ projectId: 1, deviceType: 1 });
deviceInstallationSchema.index({ serialNumber: 1 });
deviceInstallationSchema.index({ 'networkDetails.ipAddress': 1 });
deviceInstallationSchema.index({ createdAt: -1 });
deviceInstallationSchema.index({ assignedTo: 1 });
deviceInstallationSchema.index({ projectId: 1, status: 1, assignedTo: 1 });

// Constants
export const DeviceTypes = {
  IP_CAMERA: 'IPCamera',
  NVR: 'NVR',
  DVR: 'DVR',
  PTZ: 'PTZ',
  CABLE: 'Cable',
  ACCESS_POINT: 'AccessPoint',
  SWITCH: 'Switch',
  ROUTER: 'Router',
  UPS: 'UPS',
  OTHER: 'Other'
};

export const InstallationStatuses = {
  PENDING: 'Pending',
  INSTALLED: 'Installed',
  CONFIGURED: 'Configured',
  TESTED: 'Tested',
  DEPLOYED: 'Deployed',
  FAULTY: 'Faulty',
  REPLACED: 'Replaced'
};

export const CableTypes = {
  CAT5: 'CAT5',
  CAT6: 'CAT6',
  CAT6A: 'CAT6A',
  FIBER: 'Fiber',
  COAXIAL: 'Coaxial',
  POWER: 'Power',
  OTHER: 'Other'
};

export default mongoose.model('DeviceInstallation', deviceInstallationSchema);
