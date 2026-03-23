import mongoose from 'mongoose';

const projectZoneSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required']
  },
  zoneName: {
    type: String,
    required: [true, 'Zone name is required'],
    maxlength: 100,
    trim: true
  },
  zoneCode: {
    type: String,
    maxlength: 20,
    trim: true
  },
  description: {
    type: String,
    maxlength: 500
  },

  // Boundary GPS points (polygon corners)
  boundaryPoints: [{
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
  }],

  // Zone center for quick reference
  centerLatitude: {
    type: Number,
    min: -90,
    max: 90
  },
  centerLongitude: {
    type: Number,
    min: -180,
    max: 180
  },

  // Device planning
  plannedDeviceCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
projectZoneSchema.index({ projectId: 1 });
projectZoneSchema.index({ projectId: 1, zoneName: 1 }, { unique: true });
projectZoneSchema.index({ isActive: 1 });

// Virtual for installed devices in this zone
projectZoneSchema.virtual('installedDevices', {
  ref: 'DeviceInstallation',
  localField: '_id',
  foreignField: 'zoneId'
});

export default mongoose.model('ProjectZone', projectZoneSchema);
