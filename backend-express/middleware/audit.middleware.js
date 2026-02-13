import AuditLog from '../models/AuditLog.model.js';

// ============================================================================
// Audit Logger Middleware
// ============================================================================
// Provides middleware and utility functions for security audit logging.
// ============================================================================

/**
 * Create an audit log entry.
 * 
 * @param {Object} params
 * @param {Object} params.user - The user performing the action (req.user)
 * @param {string} params.action - The action being performed
 * @param {string} params.resourceType - Type of resource being accessed
 * @param {string} params.resourceId - ID of the resource
 * @param {string} params.details - Human-readable description
 * @param {string[]} params.fieldsAccessed - List of sensitive fields accessed
 * @param {Object} params.req - Express request object (for IP/UA extraction)
 * @param {boolean} params.success - Whether the action was successful
 * @param {Object} params.metadata - Additional context
 */
export const createAuditLog = async ({
    user,
    action,
    resourceType,
    resourceId,
    details,
    fieldsAccessed = [],
    req = null,
    success = true,
    metadata = null
}) => {
    try {
        await AuditLog.create({
            userId: user?._id || user?.id,
            userRole: user?.role || 'unknown',
            userName: user?.fullName || user?.username || 'unknown',
            action,
            resourceType,
            resourceId,
            details,
            fieldsAccessed,
            ipAddress: req ? (req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip) : undefined,
            userAgent: req ? req.headers['user-agent']?.substring(0, 500) : undefined,
            success,
            metadata
        });
    } catch (error) {
        // Audit log failures should never break the main flow
        // But we log to stderr for monitoring
        console.error('[AUDIT_LOG_ERROR]', error.message);
    }
};

/**
 * Express middleware that logs sensitive data access.
 * Attach to routes that return decrypted data.
 * 
 * Usage:
 *   router.get('/:id/credentials', protect, auditAccess('VIEW_CREDENTIALS', 'Asset'), getAssetCredentials);
 * 
 * @param {string} action - The audit action
 * @param {string} resourceType - The resource type
 * @param {string[]} fieldsAccessed - Fields that will be accessed
 * @returns {Function} Express middleware
 */
export const auditAccess = (action, resourceType, fieldsAccessed = []) => {
    return (req, res, next) => {
        // Store audit info on request for the controller to use
        req.auditContext = {
            action,
            resourceType,
            fieldsAccessed
        };

        // Capture the original res.json to log after response
        const originalJson = res.json.bind(res);
        res.json = function (data) {
            // Log the access after successful response
            if (res.statusCode >= 200 && res.statusCode < 300) {
                createAuditLog({
                    user: req.user,
                    action,
                    resourceType,
                    resourceId: req.params.id,
                    details: `${action} on ${resourceType} ${req.params.id || 'multiple'}`,
                    fieldsAccessed,
                    req,
                    success: true
                });
            }
            return originalJson(data);
        };

        next();
    };
};

/**
 * Log a failed authentication attempt.
 */
export const logAuthFailure = async (req, username, reason) => {
    try {
        await AuditLog.create({
            userId: null,
            userRole: 'unknown',
            userName: username || 'unknown',
            action: 'AUTH_FAILED',
            resourceType: 'System',
            details: reason || 'Authentication failed',
            ipAddress: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip,
            userAgent: req.headers['user-agent']?.substring(0, 500),
            success: false
        });
    } catch (error) {
        console.error('[AUDIT_LOG_ERROR]', error.message);
    }
};

export default {
    createAuditLog,
    auditAccess,
    logAuthFailure
};
