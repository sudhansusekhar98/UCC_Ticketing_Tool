import mongoose from 'mongoose';

const vendorWorkLogSchema = new mongoose.Schema({
  logNumber: {
    type: String,
    unique: true,
    maxlength: 20
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required']
  },

  // Vendor Info
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  vendorCompanyName: {
    type: String,
    maxlength: 200,
    trim: true
  },
  workOrderId: {
    type: String,
    maxlength: 50,
    trim: true
  },
  supervisorName: {
    type: String,
    maxlength: 100,
    trim: true
  },
  supervisorContact: {
    type: String,
    maxlength: 20
  },

  // Crew Info
  crewCount: {
    type: Number,
    min: 0,
    default: 0
  },
  labourHours: {
    type: Number,
    min: 0,
    default: 0
  },

  // Labour Type
  labourType: {
    type: String,
    enum: ['RoadDigging', 'CableLaying', 'Backfilling', 'RoadRestoration', 'Trenching', 'Ducting', 'Cabling', 'Other'],
    required: [true, 'Labour type is required']
  },

  // Area Worked (GPS from/to)
  areaWorked: {
    fromLatitude: {
      type: Number,
      min: -90,
      max: 90
    },
    fromLongitude: {
      type: Number,
      min: -180,
      max: 180
    },
    toLatitude: {
      type: Number,
      min: -90,
      max: 90
    },
    toLongitude: {
      type: Number,
      min: -180,
      max: 180
    },
    lengthMeters: {
      type: Number,
      min: 0
    },
    widthMeters: {
      type: Number,
      min: 0
    },
    depthMeters: {
      type: Number,
      min: 0
    }
  },

  // Trench Details
  trenchId: {
    type: String,
    maxlength: 50
  },
  trenchStatus: {
    type: String,
    enum: ['Open', 'CableLaid', 'Backfilled', 'RoadRestored', 'Completed'],
    default: 'Open'
  },

  // Work Description
  workDescription: {
    type: String,
    maxlength: 2000
  },

  // Challenges faced
  challenges: {
    type: String,
    maxlength: 2000
  },
  challengeType: {
    type: String,
    enum: ['None', 'SoilIssues', 'UtilityClashes', 'PermitDelays', 'WeatherDelays', 'MaterialShortage', 'Other']
  },

  // Log Date
  logDate: {
    type: Date,
    required: [true, 'Log date is required']
  },

  // Submitted by (PM or Vendor)
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Photos
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

  // Equipment used
  equipmentUsed: [{
    equipmentName: {
      type: String,
      maxlength: 100
    },
    quantity: {
      type: Number,
      min: 0
    },
    hoursUsed: {
      type: Number,
      min: 0
    }
  }],

  // Materials used
  materialsUsed: [{
    materialName: {
      type: String,
      maxlength: 100
    },
    quantity: {
      type: Number,
      min: 0
    },
    unit: {
      type: String,
      maxlength: 20
    }
  }],

  // Linked to daily log
  linkedDailyLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PMDailyLog'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
vendorWorkLogSchema.index({ projectId: 1 });
vendorWorkLogSchema.index({ vendorId: 1 });
vendorWorkLogSchema.index({ logDate: -1 });
vendorWorkLogSchema.index({ labourType: 1 });
vendorWorkLogSchema.index({ trenchStatus: 1 });
vendorWorkLogSchema.index({ projectId: 1, logDate: -1 });
vendorWorkLogSchema.index({ createdAt: -1 });
vendorWorkLogSchema.index({ logNumber: 1 });

// Pre-save hook for auto-generating log number
vendorWorkLogSchema.pre('save', async function(next) {
  if (this.isNew && !this.logNumber) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    const lastLog = await this.constructor.findOne({
      logNumber: new RegExp(`^VWL-${dateStr}-`)
    }).sort({ logNumber: -1 });

    let sequence = 1;
    if (lastLog) {
      const lastSequence = parseInt(lastLog.logNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    this.logNumber = `VWL-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }
  next();
});

// Constants
export const LabourTypes = {
  ROAD_DIGGING: 'RoadDigging',
  CABLE_LAYING: 'CableLaying',
  BACKFILLING: 'Backfilling',
  ROAD_RESTORATION: 'RoadRestoration',
  TRENCHING: 'Trenching',
  DUCTING: 'Ducting',
  CABLING: 'Cabling',
  OTHER: 'Other'
};

export const TrenchStatuses = {
  OPEN: 'Open',
  CABLE_LAID: 'CableLaid',
  BACKFILLED: 'Backfilled',
  ROAD_RESTORED: 'RoadRestored',
  COMPLETED: 'Completed'
};

export const ChallengeTypes = {
  NONE: 'None',
  SOIL_ISSUES: 'SoilIssues',
  UTILITY_CLASHES: 'UtilityClashes',
  PERMIT_DELAYS: 'PermitDelays',
  WEATHER_DELAYS: 'WeatherDelays',
  MATERIAL_SHORTAGE: 'MaterialShortage',
  OTHER: 'Other'
};

export default mongoose.model('VendorWorkLog', vendorWorkLogSchema);
