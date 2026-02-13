import { body, param, query, validationResult } from 'express-validator';

// ============================================================================
// Input Validation & Sanitization Middleware
// ============================================================================
// Uses express-validator for input validation and sanitization.
// Prevents injection attacks, XSS, and malformed input.
// ============================================================================

/**
 * Middleware to check validation results and return errors.
 */
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// ============================================================================
// Auth Validators
// ============================================================================

export const loginValidator = [
    body('username')
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ max: 50 }).withMessage('Username must be 50 characters or less')
        .escape(), // XSS prevention
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6, max: 128 }).withMessage('Password must be between 6 and 128 characters'),
    validate
];

export const changePasswordValidator = [
    body('currentPassword')
        .notEmpty().withMessage('Current password is required'),
    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    validate
];

// ============================================================================
// Asset Validators
// ============================================================================

export const createAssetValidator = [
    body('assetCode')
        .trim()
        .notEmpty().withMessage('Asset code is required')
        .isLength({ max: 50 }).withMessage('Asset code must be 50 characters or less')
        .escape(),
    body('assetType')
        .trim()
        .notEmpty().withMessage('Asset type is required')
        .isLength({ max: 50 }).withMessage('Asset type must be 50 characters or less')
        .escape(),
    body('siteId')
        .notEmpty().withMessage('Site ID is required')
        .isMongoId().withMessage('Invalid Site ID'),
    body('serialNumber')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Serial number must be 100 characters or less'),
    body('mac')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('MAC address must be 50 characters or less'),
    body('ipAddress')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('IP address must be 50 characters or less'),
    body('password')
        .optional()
        .isLength({ max: 255 }).withMessage('Password must be 255 characters or less'),
    body('criticality')
        .optional()
        .isInt({ min: 1, max: 3 }).withMessage('Criticality must be 1, 2, or 3'),
    body('status')
        .optional()
        .isIn(['Operational', 'Degraded', 'Offline', 'Maintenance', 'In Repair', 'Not Installed', 'Spare', 'InTransit', 'Damaged', 'Reserved', 'Online', 'Passive Device'])
        .withMessage('Invalid status value'),
    validate
];

export const updateAssetValidator = [
    param('id')
        .isMongoId().withMessage('Invalid asset ID'),
    body('assetCode')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('Asset code must be 50 characters or less')
        .escape(),
    body('serialNumber')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Serial number must be 100 characters or less'),
    body('mac')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('MAC address must be 50 characters or less'),
    body('ipAddress')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('IP address must be 50 characters or less'),
    body('password')
        .optional()
        .isLength({ max: 255 }).withMessage('Password must be 255 characters or less'),
    validate
];

// ============================================================================
// Notification Validators
// ============================================================================

export const createNotificationValidator = [
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({ max: 200 }).withMessage('Title must be 200 characters or less')
        .escape(),
    body('message')
        .trim()
        .notEmpty().withMessage('Message is required')
        .isLength({ max: 1000 }).withMessage('Message must be 1000 characters or less'),
    body('type')
        .optional()
        .isIn(['info', 'success', 'warning', 'error', 'announcement', 'ticket', 'system'])
        .withMessage('Invalid notification type'),
    body('isBroadcast')
        .optional()
        .isBoolean().withMessage('isBroadcast must be a boolean'),
    body('userId')
        .optional({ nullable: true })
        .isMongoId().withMessage('Invalid user ID'),
    validate
];

// ============================================================================
// Generic ID Validator
// ============================================================================

export const mongoIdParamValidator = [
    param('id')
        .isMongoId().withMessage('Invalid ID format'),
    validate
];

export default {
    validate,
    loginValidator,
    changePasswordValidator,
    createAssetValidator,
    updateAssetValidator,
    createNotificationValidator,
    mongoIdParamValidator
};
