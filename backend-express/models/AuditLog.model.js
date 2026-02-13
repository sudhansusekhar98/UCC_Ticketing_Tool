import mongoose from 'mongoose';

// ============================================================================
// Audit Log Model
// ============================================================================
// Tracks access to sensitive data (decrypted credentials, IP addresses, etc.)
// GDPR/OWASP compliance: all access to PII and sensitive data is logged.
// ============================================================================

const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    userRole: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'VIEW_CREDENTIALS',       // Viewed decrypted device credentials
            'VIEW_IP',                // Viewed decrypted IP address
            'VIEW_MAC',               // Viewed decrypted MAC address
            'VIEW_SERIAL',            // Viewed decrypted serial number
            'EXPORT_SENSITIVE',       // Exported data containing sensitive fields
            'MODIFY_CREDENTIALS',     // Changed device login credentials
            'MODIFY_SENSITIVE',       // Modified any sensitive field
            'BULK_DECRYPT',           // Bulk decryption operation
            'AUTH_LOGIN',             // User logged in
            'AUTH_LOGOUT',            // User logged out
            'AUTH_FAILED',            // Failed login attempt
            'AUTH_PASSWORD_CHANGE',   // Password was changed
            'AUTH_REFRESH_TOKEN',     // Refresh token was used
            'PERMISSION_CHANGE',      // User permissions were changed
            'DATA_DELETE',            // Sensitive data was deleted
        ],
        index: true
    },
    resourceType: {
        type: String,
        enum: ['Asset', 'User', 'Ticket', 'AssetUpdateRequest', 'RMA', 'System'],
        index: true
    },
    resourceId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    details: {
        type: String,
        maxlength: 500
    },
    fieldsAccessed: [{
        type: String
    }],
    ipAddress: {
        type: String // Client IP address
    },
    userAgent: {
        type: String,
        maxlength: 500
    },
    success: {
        type: Boolean,
        default: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed // Additional context
    }
}, {
    timestamps: true,
    // Do NOT include virtuals for security logs
    toJSON: { virtuals: false },
    toObject: { virtuals: false }
});

// Indexes for efficient querying and retention
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, action: 1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });

// TTL index: auto-delete after 365 days (configurable)
auditLogSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 365 * 24 * 60 * 60 } // 1 year retention
);

// Prevent modification of audit logs
auditLogSchema.pre('findOneAndUpdate', function () {
    throw new Error('Audit logs cannot be modified');
});

auditLogSchema.pre('updateOne', function () {
    throw new Error('Audit logs cannot be modified');
});

auditLogSchema.pre('updateMany', function () {
    throw new Error('Audit logs cannot be modified');
});

export default mongoose.model('AuditLog', auditLogSchema);
