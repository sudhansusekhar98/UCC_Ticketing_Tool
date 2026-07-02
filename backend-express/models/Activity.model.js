import mongoose from 'mongoose';
import { generateSequentialId } from '../utils/idGenerator.js';

const activityTaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },
  order: {
    type: Number,
    default: 0
  },
  done: {
    type: Boolean,
    default: false
  },
  doneBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  doneAt: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: 500
  },
  plannedEnd: {
    type: Date
  }
}, { _id: true, timestamps: false });

const activitySchema = new mongoose.Schema({
  activityNumber: {
    type: String,
    unique: true,
    maxlength: 25
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Activity title is required'],
    maxlength: 200,
    trim: true
  },
  description: {
    type: String,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['Technical', 'Construction', 'Maintenance'],
    default: 'Technical',
    required: true
  },
  status: {
    type: String,
    enum: ['ToDo', 'InProgress', 'Review', 'Done', 'Blocked'],
    default: 'ToDo',
    index: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Med', 'High'],
    default: 'Med'
  },

  // Assignment
  leadEngineer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Lead engineer is required']
  },
  assignees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Required equipment / inventory
  requiredDevices: [{
    deviceTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeviceType'
    },
    deviceTypeName: { type: String, maxlength: 100 },
    allocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectStockAllocation', default: null },
    qty: { type: Number, min: 0, default: 1 }
  }],
  requiredStockItems: [{
    itemId: String,
    itemName: { type: String, maxlength: 200 },
    qty: { type: Number, min: 0, default: 1 }
  }],

  // Sub-tasks / execution checklist
  tasks: [activityTaskSchema],

  // Progress (0-100) — derived from the latest daily log entry or manual override
  progressPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  // Timeline
  plannedStart: { type: Date },
  plannedEnd: { type: Date },
  actualStart: { type: Date },
  actualEnd: { type: Date },

  // Rollup metrics aggregated from construction-type daily log entries
  metrics: {
    trenchingMeters: { type: Number, default: 0 },
    concreteM3: { type: Number, default: 0 },
    cableLaidMeters: { type: Number, default: 0 }
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Soft delete
  isActive: {
    type: Boolean,
    default: true
  },
  deletedAt: { type: Date }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
activitySchema.index({ projectId: 1, status: 1 });
activitySchema.index({ projectId: 1, isActive: 1 });
activitySchema.index({ leadEngineer: 1 });
activitySchema.index({ assignees: 1 });
activitySchema.index({ createdAt: -1 });

// Pre-save hook for auto-generating activity number
activitySchema.pre('save', async function(next) {
  if (this.isNew && !this.activityNumber) {
    this.activityNumber = await generateSequentialId(this.constructor, 'activityNumber', 'ACT');
  }

  // Auto-manage actualStart / actualEnd based on status transitions
  if (this.isModified('status')) {
    if (this.status === 'InProgress' && !this.actualStart) {
      this.actualStart = new Date();
    }
    if (this.status === 'Done' && !this.actualEnd) {
      this.actualEnd = new Date();
      this.progressPercentage = 100;
    }
  }

  next();
});

// Virtual: linked daily log entries (populated on demand)
activitySchema.virtual('dailyLogEntries', {
  ref: 'PMDailyLog',
  localField: '_id',
  foreignField: 'activityEntries.activityId'
});

// Constants
export const ActivityTypes = {
  TECHNICAL: 'Technical',
  CONSTRUCTION: 'Construction',
  MAINTENANCE: 'Maintenance'
};

export const ActivityStatuses = {
  TODO: 'ToDo',
  IN_PROGRESS: 'InProgress',
  REVIEW: 'Review',
  DONE: 'Done',
  BLOCKED: 'Blocked'
};

export const ActivityPriorities = {
  LOW: 'Low',
  MED: 'Med',
  HIGH: 'High'
};

export default mongoose.model('Activity', activitySchema);
