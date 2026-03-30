import mongoose from 'mongoose';

const siteSchema = new mongoose.Schema({
  siteName: {
    type: String,
    required: [true, 'Site name is required'],
    maxlength: 100,
    trim: true
  },
  siteUniqueID: {
    type: String,
    required: [true, 'Site unique ID is required'],
    unique: true,
    maxlength: 50,
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    maxlength: 100,
    trim: true
  },
  zone: {
    type: String,
    maxlength: 100,
    trim: true
  },
  ward: {
    type: String,
    maxlength: 100,
    trim: true
  },
  address: {
    type: String,
    maxlength: 500,
    trim: true
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
  },
  contactPerson: {
    type: String,
    maxlength: 100,
    trim: true
  },
  contactPhone: {
    type: String,
    maxlength: 20,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isHeadOffice: {
    type: Boolean,
    default: false
  },
  abbreviation: {
    type: String,
    maxlength: 20,
    trim: true,
    uppercase: true
  },
  // Per-site SLA configuration (overrides global SLAPolicy when present)
  slaPolicies: [{
    priority: {
      type: String,
      enum: ['P1', 'P2', 'P3', 'P4'],
      required: true
    },
    responseTimeMinutes: {
      type: Number,
      required: true,
      min: 0
    },
    restoreTimeMinutes: {
      type: Number,
      required: true,
      min: 0
    },
    escalationLevel1Minutes: {
      type: Number,
      min: 0,
      default: 0
    },
    escalationLevel2Minutes: {
      type: Number,
      min: 0,
      default: 0
    },
    escalationL1Emails: {
      type: String,
      maxlength: 200,
      trim: true
    },
    escalationL2Emails: {
      type: String,
      maxlength: 200,
      trim: true
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes (siteUniqueID index is already created via unique: true)
siteSchema.index({ city: 1 });
siteSchema.index({ isActive: 1 });

// Virtual for assets
siteSchema.virtual('assets', {
  ref: 'Asset',
  localField: '_id',
  foreignField: 'siteId'
});

// Virtual for assigned engineers
siteSchema.virtual('assignedEngineers', {
  ref: 'User',
  localField: '_id',
  foreignField: 'siteId'
});

export default mongoose.model('Site', siteSchema);
