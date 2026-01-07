import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import UserRight from '../models/UserRight.model.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-passwordHash');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account is inactive'
        });
      }

      // Fetch user rights
      const userRights = await UserRight.findOne({ user: req.user._id });
      req.user.rights = userRights ? userRights.rights : [];

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Grant access to specific roles OR permissions
export const allowAccess = ({ roles = [], right = '' }) => {
  return (req, res, next) => {
    // Check if user has one of the allowed roles
    const hasRole = roles.length === 0 || roles.includes(req.user.role);
    
    // Check if user has the specific right
    const hasRight = right && req.user.rights && req.user.rights.includes(right);

    if (hasRole || hasRight) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  };
};

// Deprecated: verify where this is used and replace with allowAccess if needed, 
// or keep for simple role-only checks
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};
