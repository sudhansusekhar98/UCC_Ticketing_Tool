import mongoose from 'mongoose';

const ticketActivitySchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  activityType: {
    type: String,
    required: true,
    enum: ['Comment', 'StatusChange', 'Assignment', 'Escalation', 'Resolution', 'Attachment', 'Note', 'RMA'],
    default: 'Comment'
  },
  content: {
    type: String,
    required: true
  },
  isInternal: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: { createdAt: 'createdOn', updatedAt: false }
});

// Indexes
ticketActivitySchema.index({ ticketId: 1, createdOn: -1 });
ticketActivitySchema.index({ userId: 1 });

// Virtual for attachments
ticketActivitySchema.virtual('attachments', {
  ref: 'TicketAttachment',
  localField: '_id',
  foreignField: 'activityId'
});

export default mongoose.model('TicketActivity', ticketActivitySchema);
