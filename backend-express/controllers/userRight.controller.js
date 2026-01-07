import UserRight from '../models/UserRight.model.js';
import User from '../models/User.model.js';

// @desc    Get all user rights (for admin list)
// @route   GET /api/user-rights
// @access  Admin
export const getAllUserRights = async (req, res, next) => {
  try {
    // Get all users first, then map rights
    const users = await User.find({}).select('fullName email role designation');
    const userRights = await UserRight.find({});

    const result = users.map(user => {
      const rightRecord = userRights.find(ur => ur.user.toString() === user._id.toString());
      return {
        user,
        rights: rightRecord ? rightRecord.rights : []
      };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get rights for a specific user
// @route   GET /api/user-rights/:userId
// @access  Admin
export const getUserRights = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    let userRight = await UserRight.findOne({ user: userId });
    
    if (!userRight) {
      // Return empty rights if not found
      return res.json({
        success: true,
        data: []
      });
    }

    res.json({
      success: true,
      data: userRight.rights
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update rights for a user
// @route   PUT /api/user-rights/:userId
// @access  Admin
export const updateUserRights = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { rights } = req.body; // Expects array of strings

    if (!Array.isArray(rights)) {
      return res.status(400).json({
        success: false,
        message: 'Rights must be an array of strings'
      });
    }

    let userRight = await UserRight.findOne({ user: userId });

    if (userRight) {
      userRight.rights = rights;
      await userRight.save();
    } else {
      userRight = await UserRight.create({
        user: userId,
        rights
      });
    }

    res.json({
      success: true,
      data: userRight.rights,
      message: 'User rights updated successfully'
    });
  } catch (error) {
    next(error);
  }
};
