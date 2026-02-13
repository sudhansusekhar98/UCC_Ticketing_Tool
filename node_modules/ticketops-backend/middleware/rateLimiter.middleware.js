import rateLimit from 'express-rate-limit';

// ============================================================================
// Rate Limiting Middleware
// ============================================================================
// Protects against brute-force attacks and API abuse.
// Different limits for different route sensitivity levels.
// ============================================================================

/**
 * General API rate limiter.
 * 100 requests per 15 minutes per IP.
 */
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Authentication rate limiter (login, password change).
 * 10 attempts per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false
});

/**
 * Sensitive data rate limiter (credential access, exports).
 * 30 requests per 15 minutes per IP.
 */
export const sensitiveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30,
    message: {
        success: false,
        message: 'Too many requests for sensitive data. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Strict rate limiter for highly sensitive operations (bulk decrypt, export).
 * 5 requests per 15 minutes per IP.
 */
export const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Rate limit exceeded for this operation. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

export default {
    generalLimiter,
    authLimiter,
    sensitiveLimiter,
    strictLimiter
};
