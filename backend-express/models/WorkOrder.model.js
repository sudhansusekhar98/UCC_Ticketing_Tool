import mongoose from 'mongoose';

const workOrderSchema = new mongoose.Schema({
  workOrderNumber: {
    type: String,
    required: true,
    unique: true,
    maxlength: 20
  },
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  engineerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Accepted', 'InTransit', 'AtSite', 'InProgress', 'Completed', 'PendingApproval', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  workOrderType: {
    type: String,
    enum: ['Corrective', 'Preventive', 'Inspection'],
    default: 'Corrective'
  },
  checklistJson: {
    type: String // JSON string
  },
  partsUsedJson: {
    type: String // JSON string
  },
  scheduledDate: Date,
  startedOn: Date,
  completedOn: Date,
  // Location tracking
  startLatitude: Number,
  startLongitude: Number,
  endLatitude: Number,
  endLongitude: Number,
  // Work details
  workPerformed: {
    type: String,
    maxlength: 2000
  },
  remarks: {
    type: String,
    maxlength: 2000
  },
  observations: {
    type: String,
    maxlength: 1000
  },
  // Approval
  requiresApproval: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedOn: Date,
  approvalRemarks: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Indexes
workOrderSchema.index({ workOrderNumber: 1 });
workOrderSchema.index({ ticketId: 1 });
workOrderSchema.index({ engineerId: 1 });
workOrderSchema.index({ status: 1 });

// Pre-save hook to generate work order number
workOrderSchema.pre('save', async function(next) {
  if (this.isNew && !this.workOrderNumber) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    const lastWO = await this.constructor.findOne({
      workOrderNumber: new RegExp(`^WO-${dateStr}-`)
    }).sort({ workOrderNumber: -1 });
    
    let sequence = 1;
    if (lastWO) {
      const lastSequence = parseInt(lastWO.workOrderNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }
    
    this.workOrderNumber = `WO-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }
  next();
});

export const WorkOrderStatuses = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  IN_TRANSIT: 'InTransit',
  AT_SITE: 'AtSite',
  IN_PROGRESS: 'InProgress',
  COMPLETED: 'Completed',
  PENDING_APPROVAL: 'PendingApproval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected'
};

export default mongoose.model('WorkOrder', workOrderSchema);
