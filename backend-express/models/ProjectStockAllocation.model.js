import mongoose from 'mongoose';

const projectStockAllocationSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required']
  },
  stockItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: [true, 'Stock item ID is required']
  },
  allocatedQty: {
    type: Number,
    required: [true, 'Allocated quantity is required'],
    min: [1, 'Allocated quantity must be at least 1']
  },
  installedQty: {
    type: Number,
    default: 0,
    min: 0
  },
  faultyQty: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['Allocated', 'PartiallyInstalled', 'FullyInstalled'],
    default: 'Allocated'
  },
  allocatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  allocatedOn: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    maxlength: 500,
    trim: true
  },
  changeLog: [{
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changeDate: {
      type: Date,
      default: Date.now
    },
    previousQty: Number,
    newQty: Number,
    reason: {
      type: String,
      maxlength: 500
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: remaining qty
projectStockAllocationSchema.virtual('remainingQty').get(function () {
  return Math.max(0, this.allocatedQty - this.installedQty - this.faultyQty);
});

// Indexes
projectStockAllocationSchema.index({ projectId: 1 });
projectStockAllocationSchema.index({ stockItemId: 1 });
projectStockAllocationSchema.index({ projectId: 1, stockItemId: 1 });
projectStockAllocationSchema.index({ status: 1 });

// Pre-save: auto-update status
projectStockAllocationSchema.pre('save', function (next) {
  const used = this.installedQty + this.faultyQty;
  if (used >= this.allocatedQty) {
    this.status = 'FullyInstalled';
  } else if (used > 0) {
    this.status = 'PartiallyInstalled';
  } else {
    this.status = 'Allocated';
  }
  next();
});

export default mongoose.model('ProjectStockAllocation', projectStockAllocationSchema);
