import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // null means broadcast to all users
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    maxlength: 200,
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    maxlength: 1000,
    trim: true
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error', 'announcement', 'ticket', 'system'],
    default: 'info'
  },
  link: {
    type: String, // Optional link to navigate when notification is clicked
    trim: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isBroadcast: {
    type: Boolean,
    default: false // If true, shows to all users
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  expiresAt: {
    type: Date // Optional expiry date for the notification
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ isBroadcast: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Notification types
export const NotificationTypes = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  ANNOUNCEMENT: 'announcement',
  TICKET: 'ticket',
  SYSTEM: 'system'
};

export default mongoose.model('Notification', notificationSchema);
