import User from '../models/User.model.js';
import UserRight from '../models/UserRight.model.js';
import {
  generateToken,
  generateRefreshToken,
  hashPassword,
  comparePassword,
  verifyRefreshToken
} from '../utils/auth.utils.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';
import fs from 'fs';

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }

    // Check for user (include password for verification)
    const user = await User.findOne({ username }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated'
      });
    }

    // Check password
    const isPasswordMatch = await comparePassword(password, user.passwordHash);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLoginOn = new Date();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshToken = refreshToken;
    user.refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await user.save();

    // Remove password from output
    user.passwordHash = undefined;

    // Get user rights
    const userRight = await UserRight.findOne({ user: user._id });

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          designation: user.designation,
          mobileNumber: user.mobileNumber,
          siteId: user.siteId,
          assignedSites: user.assignedSites || [],
          rights: {
            siteRights: userRight?.siteRights || [],
            globalRights: userRight?.globalRights || []
          },
          preferences: user.preferences
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('siteId', 'siteName siteUniqueID')
      .populate('assignedSites', 'siteName siteUniqueID');

    const userRight = await UserRight.findOne({ user: req.user.id });

    // Convert to object to append rights
    const userObj = user.toObject();

    // Extract only siteRights and globalRights (not the full Mongoose document)
    userObj.rights = {
      siteRights: userRight?.siteRights || [],
      globalRights: userRight?.globalRights || []
    };

    res.json({
      success: true,
      data: userObj
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Find user with this refresh token
    const user = await User.findOne({
      _id: decoded.id,
      refreshToken,
      refreshTokenExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired or invalid'
      });
    }

    // Generate new access token
    const newToken = generateToken(user._id);

    res.json({
      success: true,
      data: {
        token: newToken
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    // Clear refresh token
    await User.findByIdAndUpdate(req.user.id, {
      refreshToken: null,
      refreshTokenExpiry: null
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user preferences
// @route   PUT /api/auth/preferences
// @access  Private
export const updatePreferences = async (req, res, next) => {
  try {
    const { preferences } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.preferences = {
      ...user.preferences,
      ...preferences
    };

    await user.save();

    res.json({
      success: true,
      data: {
        preferences: user.preferences
      },
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id).select('+passwordHash');

    // Check current password
    const isMatch = await comparePassword(currentPassword, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile picture
// @route   PUT /api/auth/profile-picture
// @access  Private
export const updateProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const file = req.file;
    const isMemoryStorage = !!file.buffer;

    // Delete old picture from Cloudinary if it exists
    if (user.cloudinaryId) {
      try {
        await deleteFromCloudinary(user.cloudinaryId);
      } catch (err) {
        console.error('Failed to delete old profile picture from Cloudinary:', err);
      }
    }

    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(
      isMemoryStorage ? file.buffer : file.path,
      {
        folder: 'ticketops/profiles',
        resourceType: 'image',
        mimeType: file.mimetype
      }
    );

    if (!cloudinaryResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image to Cloudinary: ' + (cloudinaryResult.error || 'Unknown error')
      });
    }

    // Update user record
    user.profilePicture = cloudinaryResult.url;
    user.cloudinaryId = cloudinaryResult.publicId;
    await user.save();

    // Delete local file if it exists
    if (!isMemoryStorage && file.path) {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error('Failed to delete local file:', err);
      }
    }

    res.json({
      success: true,
      data: {
        profilePicture: user.profilePicture
      },
      message: 'Profile picture updated successfully'
    });
  } catch (error) {
    next(error);
  }
};
