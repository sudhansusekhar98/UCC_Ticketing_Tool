import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_ALGORITHM = 'HS256';

export const generateToken = (id) => {
  const defaultExpiry = process.env.NODE_ENV === 'production' ? '1h' : '24h';
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || defaultExpiry,
    algorithm: JWT_ALGORITHM
  });
};

export const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
    algorithm: JWT_ALGORITHM
  });
};

export const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'Password must contain at least one special character';
  }
  return null;
};

export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(password, salt);
};

export const comparePassword = async (enteredPassword, hashedPassword) => {
  return await bcrypt.compare(enteredPassword, hashedPassword);
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET, { algorithms: [JWT_ALGORITHM] });
  } catch {
    return null;
  }
};

export const validateJwtSecrets = () => {
  const errors = [];
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be set and at least 32 characters');
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
    errors.push('JWT_REFRESH_SECRET must be set and at least 32 characters');
  }
  if (errors.length > 0) {
    console.error('❌ JWT Configuration Errors:');
    errors.forEach(e => console.error(`   - ${e}`));
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};
