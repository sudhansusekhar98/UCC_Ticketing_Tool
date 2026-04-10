import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  projectNumber: {
    type: String,
    unique: true,
    maxlength: 20
  },
  projectName: {
    type: String,
    required: [true, 'Project name is required'],
    maxlength: 200,
    trim: true
  },
  clientName: {
    type: String,
    required: [true, 'Client name is required'],
    maxlength: 200,
    trim: true
  },
  description: {
    type: String,
    maxlength: 2000
  },

  // Location Details
  siteAddress: {
    type: String,
    required: [true, 'Site address is required'],
    maxlength: 500
  },
  city: {
    type: String,
    maxlength: 100
  },
  state: {
    type: String,
    maxlength: 100
  },
  pincode: {
    type: String,
    maxlength: 10
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

  // Contract Details
  contractStartDate: {
    type: Date,
    required: [true, 'Contract start date is required']
  },
  contractEndDate: {
    type: Date,
    required: [true, 'Contract end date is required']
  },
  contractValue: {
    type: Number,
    min: 0
  },

  // Status
  status: {
    type: String,
    enum: ['Planning', 'Active', 'OnHold', 'Completed', 'Cancelled'],
    default: 'Planning'
  },

  // Assigned PM (single primary PM)
  assignedPM: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Assigned PM is required']
  },

  // Additional team members
  teamMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Assigned Vendors
  assignedVendors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Optional link to existing Site
  linkedSiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site'
  },

  // Linked Survey from external Survey application
  linkedSurveyId: {
    type: String,
    trim: true,
    index: true
  },
  linkedSurveyName: {
    type: String,
    trim: true,
    maxlength: 300
  },
  surveyDeviceRequirements: [{
    itemId: String,
    itemName: String,
    itemTypeName: String,
    totalExisting: Number,
    totalRequired: Number
  }],

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    maxlength: 50
  }],

  // Soft delete
  isActive: {
    type: Boolean,
    default: true
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
projectSchema.index({ status: 1 });
projectSchema.index({ assignedPM: 1 });
projectSchema.index({ contractStartDate: 1, contractEndDate: 1 });
projectSchema.index({ clientName: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ isActive: 1 });
projectSchema.index({ projectNumber: 1 });

// Pre-save hook for auto-generating project number
projectSchema.pre('save', async function(next) {
  if (this.isNew && !this.projectNumber) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    const lastProject = await this.constructor.findOne({
      projectNumber: new RegExp(`^PRJ-${dateStr}-`)
    }).sort({ projectNumber: -1 });

    let sequence = 1;
    if (lastProject) {
      const lastSequence = parseInt(lastProject.projectNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    this.projectNumber = `PRJ-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }
  next();
});

// Virtuals
projectSchema.virtual('zones', {
  ref: 'ProjectZone',
  localField: '_id',
  foreignField: 'projectId'
});

projectSchema.virtual('dailyLogs', {
  ref: 'PMDailyLog',
  localField: '_id',
  foreignField: 'projectId'
});

projectSchema.virtual('devices', {
  ref: 'DeviceInstallation',
  localField: '_id',
  foreignField: 'projectId'
});

projectSchema.virtual('vendorLogs', {
  ref: 'VendorWorkLog',
  localField: '_id',
  foreignField: 'projectId'
});

projectSchema.virtual('challenges', {
  ref: 'ChallengeLog',
  localField: '_id',
  foreignField: 'projectId'
});

// Constants
export const ProjectStatuses = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  ON_HOLD: 'OnHold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

export default mongoose.model('Project', projectSchema);
