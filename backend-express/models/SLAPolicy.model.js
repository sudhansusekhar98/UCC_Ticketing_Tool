import mongoose from 'mongoose';

const slaSchema = new mongoose.Schema({
  policyName: {
    type: String,
    required: [true, 'Policy name is required'],
    maxlength: 100,
    trim: true
  },
  priority: {
    type: String,
    required: [true, 'Priority is required'],
    enum: ['P1', 'P2', 'P3', 'P4'],
    maxlength: 20
  },
  responseTimeMinutes: {
    type: Number,
    required: [true, 'Response time is required'],
    min: 0
  },
  restoreTimeMinutes: {
    type: Number,
    required: [true, 'Restore time is required'],
    min: 0
  },
  escalationLevel1Minutes: {
    type: Number,
    required: true,
    min: 0
  },
  escalationLevel2Minutes: {
    type: Number,
    required: true,
    min: 0
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
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
slaSchema.index({ priority: 1 });
slaSchema.index({ isActive: 1 });

// Virtual for tickets
slaSchema.virtual('tickets', {
  ref: 'Ticket',
  localField: '_id',
  foreignField: 'slaPolicyId'
});

export default mongoose.model('SLAPolicy', slaSchema);
