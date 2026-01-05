import mongoose from 'mongoose';

const ticketAttachmentSchema = new mongoose.Schema({
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TicketActivity'
  },
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true,
    maxlength: 255
  },
  contentType: {
    type: String,
    required: true,
    maxlength: 100
  },
  fileSize: {
    type: Number,
    required: true
  },
  storageType: {
    type: String,
    required: true,
    enum: ['Database', 'Cloudinary', 'FileSystem'],
    default: 'FileSystem'
  },
  filePath: {
    type: String,
    required: true,
    maxlength: 500
  },
  attachmentType: {
    type: String,
    required: true,
    enum: ['image', 'document'],
    default: 'document'
  },
  description: {
    type: String,
    maxlength: 500
  },
  cloudinaryUrl: {
    type: String,
    maxlength: 500
  },
  cloudinaryPublicId: {
    type: String,
    maxlength: 100
  },
  fileData: {
    type: Buffer,
    select: false // Don't include in queries by default
  }
}, {
  timestamps: { createdAt: 'uploadedOn', updatedAt: false }
});

// Indexes
ticketAttachmentSchema.index({ ticketId: 1 });
ticketAttachmentSchema.index({ activityId: 1 });
ticketAttachmentSchema.index({ uploadedBy: 1 });

export default mongoose.model('TicketAttachment', ticketAttachmentSchema);
