import mongoose from 'mongoose';

const pmDailyLogSchema = new mongoose.Schema({
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
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Submitted by is required']
  },
  logDate: {
    type: Date,
    required: [true, 'Log date is required']
  },

  // Work Summary
  workSummary: {
    type: String,
    required: [true, 'Work summary is required'],
    maxlength: 5000
  },

  // Task Checklist
  taskChecklist: [{
    taskName: {
      type: String,
      required: true,
      maxlength: 200
    },
    completed: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      maxlength: 500
    }
  }],

  // Progress
  progressPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  // Manpower
  manHours: {
    type: Number,
    min: 0,
    default: 0
  },
  teamCount: {
    type: Number,
    min: 0,
    default: 0
  },

  // Photos (before/after)
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
    photoType: {
      type: String,
      enum: ['Before', 'After', 'Progress', 'Issue', 'Other'],
      default: 'Progress'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // GPS capture on submission
  submissionLocation: {
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
    accuracy: {
      type: Number
    },
    capturedAt: {
      type: Date
    }
  },

  // Lock mechanism
  isLocked: {
    type: Boolean,
    default: false
  },
  lockedAt: {
    type: Date
  },
  unlockRequestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  unlockRequestedAt: {
    type: Date
  },
  unlockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  unlockedAt: {
    type: Date
  },

  // Weather conditions (optional)
  weatherConditions: {
    type: String,
    maxlength: 100
  },

  // Issues/blockers faced today
  issuesFaced: {
    type: String,
    maxlength: 2000
  },

  // Plans for tomorrow
  nextDayPlan: {
    type: String,
    maxlength: 2000
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
pmDailyLogSchema.index({ projectId: 1 });
pmDailyLogSchema.index({ submittedBy: 1 });
pmDailyLogSchema.index({ logDate: -1 });
pmDailyLogSchema.index({ projectId: 1, logDate: -1 });
pmDailyLogSchema.index({ isLocked: 1 });
pmDailyLogSchema.index({ createdAt: -1 });
pmDailyLogSchema.index({ logNumber: 1 });

// Compound unique index to prevent duplicate logs for same project/date/PM
pmDailyLogSchema.index(
  { projectId: 1, submittedBy: 1, logDate: 1 },
  { unique: true }
);

// Pre-save hook for auto-generating log number
pmDailyLogSchema.pre('save', async function(next) {
  if (this.isNew && !this.logNumber) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    const lastLog = await this.constructor.findOne({
      logNumber: new RegExp(`^LOG-${dateStr}-`)
    }).sort({ logNumber: -1 });

    let sequence = 1;
    if (lastLog) {
      const lastSequence = parseInt(lastLog.logNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    this.logNumber = `LOG-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }
  next();
});

// Method to check if log should be locked (24 hours passed)
pmDailyLogSchema.methods.shouldBeLocked = function() {
  if (this.isLocked) return true;
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.createdAt < twentyFourHoursAgo;
};

// Method to lock the log
pmDailyLogSchema.methods.lock = function() {
  this.isLocked = true;
  this.lockedAt = new Date();
  return this.save();
};

// Method to unlock the log (Admin only)
pmDailyLogSchema.methods.unlock = function(adminUserId) {
  this.isLocked = false;
  this.unlockedBy = adminUserId;
  this.unlockedAt = new Date();
  return this.save();
};

// Static method to find and lock expired logs
pmDailyLogSchema.statics.lockExpiredLogs = async function() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await this.updateMany(
    {
      isLocked: false,
      createdAt: { $lt: twentyFourHoursAgo }
    },
    {
      $set: {
        isLocked: true,
        lockedAt: new Date()
      }
    }
  );
  return result;
};

// Constants
export const PhotoTypes = {
  BEFORE: 'Before',
  AFTER: 'After',
  PROGRESS: 'Progress',
  ISSUE: 'Issue',
  OTHER: 'Other'
};

export default mongoose.model('PMDailyLog', pmDailyLogSchema);
