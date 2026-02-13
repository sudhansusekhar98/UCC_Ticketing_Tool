import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Generate JWT Token
// Short-lived access tokens (1h production, 7d dev for convenience)
export const generateToken = (id) => {
  const defaultExpiry = process.env.NODE_ENV === 'production' ? '1h' : '7d';
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || defaultExpiry
  });
};

// Generate Refresh Token
// Longer-lived but rotated on each use
export const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
  });
};

// Hash password
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Compare password
export const comparePassword = async (enteredPassword, hashedPassword) => {
  return await bcrypt.compare(enteredPassword, hashedPassword);
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};
