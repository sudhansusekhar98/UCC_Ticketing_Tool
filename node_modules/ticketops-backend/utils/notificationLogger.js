import NotificationLog from '../models/NotificationLog.model.js';

/**
 * Helper to log notifications to DB
 */
const logNotification = async (recipient, subject, content, category, relatedTicketId = null, status = 'Sent', error = null, recipientId = null, type = 'Email') => {
    try {
        await NotificationLog.create({
            recipient,
            recipientId,
            subject,
            content,
            category,
            relatedTicketId,
            status,
            error,
            type
        });
    } catch (err) {
        console.error('Error logging notification:', err);
    }
};

export { logNotification, logNotification as logEmail };
