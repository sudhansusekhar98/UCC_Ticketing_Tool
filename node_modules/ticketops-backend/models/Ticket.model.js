import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true,
    maxlength: 20
  },
  assetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset'
  },
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: [true, 'Site is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Hardware', 'Software', 'Network', 'Power', 'Connectivity', 'Other'],
    maxlength: 100
  },
  subCategory: {
    type: String,
    maxlength: 100,
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    maxlength: 500,
    trim: true
  },
  description: {
    type: String,
    maxlength: 2000,
    trim: true
  },
  priority: {
    type: String,
    required: true,
    enum: ['P1', 'P2', 'P3', 'P4'],
    default: 'P3'
  },
  priorityScore: {
    type: Number,
    default: 0
  },
  impact: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  urgency: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  status: {
    type: String,
    required: true,
    enum: ['Open', 'Assigned', 'Acknowledged', 'InProgress', 'OnHold', 'Escalated', 'Resolved', 'ResolutionRejected', 'Verified', 'Closed', 'Cancelled'],
    default: 'Open'
  },
  source: {
    type: String,
    required: true,
    enum: ['Manual', 'VMS', 'NMS', 'IoT'],
    default: 'Manual'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  slaPolicyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SLAPolicy'
  },
  assignedOn: Date,
  acknowledgedOn: Date,
  startedOn: Date,
  resolvedOn: Date,
  closedOn: Date,
  // SLA Tracking
  slaResponseDue: Date,
  slaRestoreDue: Date,
  isSLAResponseBreached: {
    type: Boolean,
    default: false
  },
  isSLARestoreBreached: {
    type: Boolean,
    default: false
  },
  isBreachWarningSent: {
    type: Boolean,
    default: false
  },
  isSlaBreachedNotificationSent: {
    type: Boolean,
    default: false
  },
  escalationLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  // Manual Escalation Tracking
  escalatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  escalatedOn: Date,
  escalationReason: String,
  escalationAcceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  escalationAcceptedOn: Date,
  // Resolution Details
  rootCause: {
    type: String,
    maxlength: 500,
    trim: true
  },
  resolutionSummary: {
    type: String,
    maxlength: 2000,
    trim: true
  },
  verifiedBy: {
    type: String,
    maxlength: 100,
    trim: true
  },
  verifiedOn: Date,
  requiresVerification: {
    type: Boolean,
    default: true
  },
  // Metadata
  tags: {
    type: String,
    maxlength: 500,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
// Note: UNIQUE index for ticketNumber is handled in the field definition above.
ticketSchema.index({ status: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ createdBy: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ siteId: 1 });
ticketSchema.index({ assetId: 1 });
ticketSchema.index({ createdAt: -1 });

// Virtual for activities
ticketSchema.virtual('activities', {
  ref: 'TicketActivity',
  localField: '_id',
  foreignField: 'ticketId'
});

// Virtual for attachments
ticketSchema.virtual('attachments', {
  ref: 'TicketAttachment',
  localField: '_id',
  foreignField: 'ticketId'
});

// Virtual for work orders
ticketSchema.virtual('workOrders', {
  ref: 'WorkOrder',
  localField: '_id',
  foreignField: 'ticketId'
});

// Pre-save hook to generate ticket number and calculate SLA
ticketSchema.pre('save', async function (next) {
  // 1. Generate Ticket Number
  if (this.isNew && !this.ticketNumber) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    // Find the last ticket created today
    const lastTicket = await this.constructor.findOne({
      ticketNumber: new RegExp(`^TKT-${dateStr}-`)
    }).sort({ ticketNumber: -1 });

    let sequence = 1;
    if (lastTicket) {
      const lastSequence = parseInt(lastTicket.ticketNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    this.ticketNumber = `TKT-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }

  // 2. Calculate priority score if not set
  if (this.impact && this.urgency && (!this.priority || this.isModified('impact') || this.isModified('urgency'))) {
    try {
      const assetCriticality = this.assetId ? (await mongoose.model('Asset').findById(this.assetId))?.criticality || 2 : 2;
      this.priorityScore = this.impact * this.urgency * assetCriticality;

      // Auto-assign priority based on score
      if (this.priorityScore >= 50) this.priority = 'P1';
      else if (this.priorityScore >= 25) this.priority = 'P2';
      else if (this.priorityScore >= 10) this.priority = 'P3';
      else this.priority = 'P4';
    } catch (error) {
      console.error('Error calculating priority score:', error);
    }
  }

  // 3. Auto-assign SLA policy and calculate due dates
  if (!this.slaPolicyId && this.priority) {
    try {
      const SLAPolicy = mongoose.model('SLAPolicy');
      const slaPolicy = await SLAPolicy.findOne({
        priority: this.priority,
        isActive: true
      });

      if (slaPolicy) {
        this.slaPolicyId = slaPolicy._id;
        const now = this.createdAt || new Date();

        if (!this.slaResponseDue) {
          this.slaResponseDue = new Date(now.getTime() + slaPolicy.responseTimeMinutes * 60 * 1000);
        }
        if (!this.slaRestoreDue) {
          this.slaRestoreDue = new Date(now.getTime() + slaPolicy.restoreTimeMinutes * 60 * 1000);
        }
      } else {
        console.warn(`No active SLAPolicy found for priority: ${this.priority}`);
      }
    } catch (error) {
      console.error('Error auto-assigning SLA policy in pre-save:', error);
    }
  }

  next();
});

// Constants
export const TicketStatuses = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  ACKNOWLEDGED: 'Acknowledged',
  IN_PROGRESS: 'InProgress',
  ON_HOLD: 'OnHold',
  ESCALATED: 'Escalated',
  RESOLVED: 'Resolved',
  RESOLUTION_REJECTED: 'ResolutionRejected',
  VERIFIED: 'Verified',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled'
};

export const TicketPriorities = {
  P1_CRITICAL: 'P1',
  P2_HIGH: 'P2',
  P3_MEDIUM: 'P3',
  P4_LOW: 'P4'
};

export const TicketCategories = {
  HARDWARE: 'Hardware',
  SOFTWARE: 'Software',
  NETWORK: 'Network',
  POWER: 'Power',
  CONNECTIVITY: 'Connectivity',
  OTHER: 'Other'
};

export default mongoose.model('Ticket', ticketSchema);
