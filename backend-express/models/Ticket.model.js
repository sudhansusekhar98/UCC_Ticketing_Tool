import mongoose from 'mongoose';
import { generateSequentialId } from '../utils/idGenerator.js';

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
    enum: [
      'Open', 'Assigned', 'Acknowledged', 'InProgress', 'OnHold',
      'Escalated', 'Resolved', 'ResolutionRejected', 'Verified',
      'Closed', 'Cancelled', 'Repaired', 'Replaced', 'Installed', 'SentToSite'
    ],
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
  slaWarning1hSent: {
    type: Boolean,
    default: false
  },
  isSlaBreachedNotificationSent: {
    type: Boolean,
    default: false
  },
  // SLA Extension — current state only; TicketActivity is the authoritative history
  // (a ticket can cycle through request → approve → re-breach → request again)
  slaExtension: {
    status: {
      type: String,
      enum: ['None', 'Pending', 'Approved', 'Rejected', 'Cancelled'],
      default: 'None'
    },
    reason: String,
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    requestedOn: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedOn: Date,
    rejectionReason: String,
    previousSlaRestoreDue: Date
  },
  lastSlaReminderSentAt: Date,
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
  },
  // RMA Tracking
  rmaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RMARequest'
  },
  rmaNumber: {
    type: String
  },
  rmaVerified: {
    type: Boolean,
    default: false
  },
  rmaFinalized: {
    type: Boolean,
    default: false
  },
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
// Compound indexes for cron job SLA queries
ticketSchema.index({ status: 1, slaRestoreDue: 1, isBreachWarningSent: 1 });
ticketSchema.index({ status: 1, slaRestoreDue: 1, isSlaBreachedNotificationSent: 1 });
ticketSchema.index({ isSLARestoreBreached: 1, lastSlaReminderSentAt: 1 });

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
    this.ticketNumber = await generateSequentialId(this.constructor, 'ticketNumber', 'TKT');
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
  // Recalculate whenever: new ticket, OR priority changed, OR SLA dates missing
  const DEFAULT_SLA = { P1: { response: 15, restore: 60 }, P2: { response: 30, restore: 240 }, P3: { response: 60, restore: 480 }, P4: { response: 120, restore: 1440 } };
  const needsSla = this.isNew || this.isModified('priority') || !this.slaResponseDue || !this.slaRestoreDue;
  if (needsSla && this.priority) {
    try {
      const now = this.createdAt || new Date();
      let slaSource = null;

      // First: check for site-level SLA override
      if (this.siteId) {
        const Site = mongoose.model('Site');
        const site = await Site.findById(this.siteId).select('slaPolicies').lean();
        if (site?.slaPolicies?.length) {
          slaSource = site.slaPolicies.find(p => p.priority === this.priority);
        }
      }

      // Second: fallback to global SLAPolicy collection
      if (!slaSource) {
        const SLAPolicy = mongoose.model('SLAPolicy');
        const globalPolicy = await SLAPolicy.findOne({ priority: this.priority, isActive: true });
        if (globalPolicy) {
          slaSource = globalPolicy;
          this.slaPolicyId = globalPolicy._id;
        }
      }

      // Third: hardcoded defaults so SLA is always set even if DB has no policies
      const defaults = DEFAULT_SLA[this.priority] || DEFAULT_SLA['P3'];
      const responseMins = slaSource?.responseTimeMinutes ?? defaults.response;
      const restoreMins = slaSource?.restoreTimeMinutes ?? defaults.restore;

      // On priority change, always recalculate from createdAt
      if (this.isNew || this.isModified('priority')) {
        this.slaResponseDue = new Date(now.getTime() + responseMins * 60 * 1000);
        this.slaRestoreDue = new Date(now.getTime() + restoreMins * 60 * 1000);
        // Reset warning flags so reminders fire for the new SLA window
        if (this.isModified('priority')) {
          this.isBreachWarningSent = false;
          this.slaWarning1hSent = false;
          this.isSlaBreachedNotificationSent = false;
          this.isSLARestoreBreached = false;
        }
      } else {
        if (!this.slaResponseDue) this.slaResponseDue = new Date(now.getTime() + responseMins * 60 * 1000);
        if (!this.slaRestoreDue) this.slaRestoreDue = new Date(now.getTime() + restoreMins * 60 * 1000);
      }

      if (!slaSource) console.warn(`No SLA policy in DB for priority ${this.priority} using hardcoded defaults`);
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
  CANCELLED: 'Cancelled',
  REPAIRED: 'Repaired',
  REPLACED: 'Replaced',
  INSTALLED: 'Installed',
  SENT_TO_SITE: 'SentToSite'
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
