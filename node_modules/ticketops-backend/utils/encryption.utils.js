import crypto from 'crypto';

// ============================================================================
// AES-256-GCM Encryption Utility
// ============================================================================
// Uses AES-256-GCM for authenticated encryption with:
// - Random 12-byte IV per encryption (NIST recommended for GCM)
// - 16-byte authentication tag for tamper detection
// - Key derived from environment variable (ENCRYPTION_KEY)
// 
// Encrypted format: "enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
// ============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes = 96 bits (NIST recommended for GCM)
const AUTH_TAG_LENGTH = 16; // 16 bytes = 128 bits
const ENCRYPTION_PREFIX = 'enc:v1:';

/**
 * Get the encryption key from environment.
 * Key must be exactly 32 bytes (256 bits) hex-encoded (64 hex chars).
 */
const getEncryptionKey = () => {
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex) {
        throw new Error(
            'ENCRYPTION_KEY is not set in environment variables. ' +
            'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        );
    }

    if (keyHex.length !== 64) {
        throw new Error(
            `ENCRYPTION_KEY must be 64 hex characters (32 bytes). Got ${keyHex.length} characters.`
        );
    }

    return Buffer.from(keyHex, 'hex');
};

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a formatted encrypted string.
 * 
 * @param {string} plaintext - The text to encrypt
 * @returns {string} Encrypted string in format "enc:v1:<iv>:<tag>:<ciphertext>"
 */
export const encrypt = (plaintext) => {
    if (!plaintext || typeof plaintext !== 'string') {
        return plaintext; // Return null/undefined/empty as-is
    }

    // Don't double-encrypt
    if (plaintext.startsWith(ENCRYPTION_PREFIX)) {
        return plaintext;
    }

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH
    });

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${ENCRYPTION_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypt an encrypted string.
 * 
 * @param {string} encryptedText - Encrypted string in format "enc:v1:<iv>:<tag>:<ciphertext>"
 * @returns {string} Decrypted plaintext
 */
export const decrypt = (encryptedText) => {
    if (!encryptedText || typeof encryptedText !== 'string') {
        return encryptedText;
    }

    // If not encrypted, return as-is (backwards compatibility)
    if (!encryptedText.startsWith(ENCRYPTION_PREFIX)) {
        return encryptedText;
    }

    const key = getEncryptionKey();

    // Parse the encrypted format
    const withoutPrefix = encryptedText.slice(ENCRYPTION_PREFIX.length);
    const parts = withoutPrefix.split(':');

    if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
    }

    const [ivHex, authTagHex, ciphertext] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};

/**
 * Check if a value is encrypted.
 * 
 * @param {string} value
 * @returns {boolean}
 */
export const isEncrypted = (value) => {
    return typeof value === 'string' && value.startsWith(ENCRYPTION_PREFIX);
};

/**
 * Mask a sensitive value for display (e.g., "192.168.1.100" -> "192.***.***.100")
 * 
 * @param {string} value - The value to mask
 * @param {string} type - Type of masking: 'ip', 'mac', 'serial', 'password', 'default'
 * @returns {string} Masked value
 */
export const maskValue = (value, type = 'default') => {
    if (!value || typeof value !== 'string') return '***';

    switch (type) {
        case 'ip':
            // Show first and last octets: "192.***.***.100"
            const ipParts = value.split('.');
            if (ipParts.length === 4) {
                return `${ipParts[0]}.***.***. ${ipParts[3]}`;
            }
            return '***.***.***';

        case 'mac':
            // Show first and last pair: "AA:**:**:**:**:FF"
            const macParts = value.split(/[:-]/);
            if (macParts.length >= 4) {
                return `${macParts[0]}:**:**:**:**:${macParts[macParts.length - 1]}`;
            }
            return '**:**:**:**:**:**';

        case 'serial':
            // Show first 3 and last 3: "ABC***XYZ"
            if (value.length > 6) {
                return `${value.slice(0, 3)}${'*'.repeat(Math.min(value.length - 6, 6))}${value.slice(-3)}`;
            }
            return '******';

        case 'password':
            return '••••••••';

        default:
            if (value.length > 4) {
                return `${value.slice(0, 2)}${'*'.repeat(Math.min(value.length - 4, 8))}${value.slice(-2)}`;
            }
            return '****';
    }
};

/**
 * Encrypt multiple fields on a plain object.
 * Modifies the object in-place and returns it.
 * 
 * @param {Object} obj - The object to encrypt fields on
 * @param {string[]} fields - Array of field names to encrypt
 * @returns {Object} The same object with encrypted fields
 */
export const encryptFields = (obj, fields) => {
    if (!obj || typeof obj !== 'object') return obj;

    for (const field of fields) {
        if (obj[field] && typeof obj[field] === 'string' && obj[field].trim() !== '') {
            obj[field] = encrypt(obj[field]);
        }
    }
    return obj;
};

/**
 * Decrypt multiple fields on a plain object.
 * Modifies the object in-place and returns it.
 * 
 * @param {Object} obj - The object to decrypt fields on
 * @param {string[]} fields - Array of field names to decrypt
 * @returns {Object} The same object with decrypted fields
 */
export const decryptFields = (obj, fields) => {
    if (!obj || typeof obj !== 'object') return obj;

    for (const field of fields) {
        if (obj[field] && isEncrypted(obj[field])) {
            try {
                obj[field] = decrypt(obj[field]);
            } catch (err) {
                console.error(`Failed to decrypt field "${field}":`, err.message);
                obj[field] = '[DECRYPTION_ERROR]';
            }
        }
    }
    return obj;
};

/**
 * Strip (remove) sensitive fields from an object entirely.
 * Returns a new object without the specified fields.
 * 
 * @param {Object} obj - Source object
 * @param {string[]} fields - Fields to strip
 * @returns {Object} New object without sensitive fields
 */
export const stripSensitiveFields = (obj, fields) => {
    if (!obj || typeof obj !== 'object') return obj;

    const result = { ...obj };
    for (const field of fields) {
        delete result[field];
    }
    return result;
};

/**
 * Mask sensitive fields on an object for safe display.
 * Returns a new object with masked values.
 * 
 * @param {Object} obj - Source object
 * @param {Object} fieldMaskMap - Map of field name to mask type  
 *   e.g., { ipAddress: 'ip', mac: 'mac', password: 'password' }
 * @returns {Object} New object with masked sensitive values
 */
export const maskSensitiveFields = (obj, fieldMaskMap) => {
    if (!obj || typeof obj !== 'object') return obj;

    const result = { ...obj };
    for (const [field, maskType] of Object.entries(fieldMaskMap)) {
        if (result[field]) {
            // Decrypt first if encrypted, then mask
            const plainValue = isEncrypted(result[field]) ? decrypt(result[field]) : result[field];
            result[field] = maskValue(plainValue, maskType);
        }
    }
    return result;
};

// Define which fields are sensitive across models
export const SENSITIVE_ASSET_FIELDS = ['ipAddress', 'mac', 'serialNumber', 'password', 'userName'];

export const ASSET_MASK_MAP = {
    ipAddress: 'ip',
    mac: 'mac',
    serialNumber: 'serial',
    password: 'password',
    userName: 'default'
};

export default {
    encrypt,
    decrypt,
    isEncrypted,
    maskValue,
    encryptFields,
    decryptFields,
    stripSensitiveFields,
    maskSensitiveFields,
    SENSITIVE_ASSET_FIELDS,
    ASSET_MASK_MAP
};
