import mongoose from 'mongoose';

const notificationLogSchema = new mongoose.Schema({
    recipient: {
        type: String,
        required: true,
        trim: true // Stores email address
    },
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Optional: if recipient is a system user
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Email', 'System'],
        default: 'Email'
    },
    category: {
        type: String,
        enum: ['Account', 'TicketAssignment', 'TicketEscalation', 'TicketStatus', 'RMA', 'BreachWarning', 'SLABreach', 'PasswordReset', 'Other'],
        default: 'Other'
    },
    relatedTicketId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket'
    },
    status: {
        type: String,
        enum: ['Sent', 'Failed'],
        default: 'Sent'
    },
    error: {
        type: String
    }
}, {
    timestamps: { createdAt: 'sentAt', updatedAt: false }
});

notificationLogSchema.index({ sentAt: -1 });
notificationLogSchema.index({ relatedTicketId: 1 });
notificationLogSchema.index({ category: 1 });

export default mongoose.model('NotificationLog', notificationLogSchema);
