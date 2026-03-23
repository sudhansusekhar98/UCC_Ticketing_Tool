import mongoose from 'mongoose';

const challengeLogSchema = new mongoose.Schema({
  challengeNumber: {
    type: String,
    unique: true,
    maxlength: 20
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required']
  },

  // Issue Classification
  issueType: {
    type: String,
    enum: ['Technical', 'Civil', 'Vendor', 'Client', 'Permit', 'Safety', 'Material', 'Weather', 'Other'],
    required: [true, 'Issue type is required']
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    required: [true, 'Severity is required'],
    default: 'Medium'
  },

  // Issue Details
  title: {
    type: String,
    required: [true, 'Title is required'],
    maxlength: 200,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: 5000
  },
  actionTaken: {
    type: String,
    maxlength: 2000
  },

  // Escalation
  escalateToAdmin: {
    type: Boolean,
    default: false
  },
  escalatedAt: {
    type: Date
  },
  escalatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Resolution Status
  resolutionStatus: {
    type: String,
    enum: ['Open', 'InProgress', 'Resolved', 'Closed', 'Deferred'],
    default: 'Open'
  },
  resolution: {
    type: String,
    maxlength: 2000
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Impact Assessment
  impact: {
    delayDays: {
      type: Number,
      min: 0
    },
    costImpact: {
      type: Number,
      min: 0
    },
    impactDescription: {
      type: String,
      maxlength: 500
    }
  },

  // Reporter
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedAt: {
    type: Date,
    default: Date.now
  },

  // Assigned to (for resolution)
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Related entities
  relatedZoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectZone'
  },
  relatedVendorLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorWorkLog'
  },
  linkedDailyLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PMDailyLog'
  },

  // Photos/Evidence
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

  // Comments/Updates
  comments: [{
    text: {
      type: String,
      required: true,
      maxlength: 1000
    },
    commentedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    commentedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Location where issue occurred
  location: {
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
challengeLogSchema.index({ projectId: 1 });
challengeLogSchema.index({ issueType: 1 });
challengeLogSchema.index({ severity: 1 });
challengeLogSchema.index({ resolutionStatus: 1 });
challengeLogSchema.index({ escalateToAdmin: 1 });
challengeLogSchema.index({ reportedBy: 1 });
challengeLogSchema.index({ assignedTo: 1 });
challengeLogSchema.index({ projectId: 1, resolutionStatus: 1 });
challengeLogSchema.index({ createdAt: -1 });
challengeLogSchema.index({ challengeNumber: 1 });

// Pre-save hook for auto-generating challenge number
challengeLogSchema.pre('save', async function(next) {
  if (this.isNew && !this.challengeNumber) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    const lastChallenge = await this.constructor.findOne({
      challengeNumber: new RegExp(`^CHL-${dateStr}-`)
    }).sort({ challengeNumber: -1 });

    let sequence = 1;
    if (lastChallenge) {
      const lastSequence = parseInt(lastChallenge.challengeNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    this.challengeNumber = `CHL-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }

  // Auto-set escalatedAt when escalating
  if (this.isModified('escalateToAdmin') && this.escalateToAdmin && !this.escalatedAt) {
    this.escalatedAt = new Date();
  }

  // Auto-set resolvedAt when resolving
  if (this.isModified('resolutionStatus') && this.resolutionStatus === 'Resolved' && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }

  next();
});

// Constants
export const IssueTypes = {
  TECHNICAL: 'Technical',
  CIVIL: 'Civil',
  VENDOR: 'Vendor',
  CLIENT: 'Client',
  PERMIT: 'Permit',
  SAFETY: 'Safety',
  MATERIAL: 'Material',
  WEATHER: 'Weather',
  OTHER: 'Other'
};

export const Severities = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical'
};

export const ResolutionStatuses = {
  OPEN: 'Open',
  IN_PROGRESS: 'InProgress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  DEFERRED: 'Deferred'
};

export default mongoose.model('ChallengeLog', challengeLogSchema);
