import UserRight from '../models/UserRight.model.js';
import User from '../models/User.model.js';

// @desc    Get all user rights (for admin list)
// @route   GET /api/user-rights
// @access  Admin
export const getAllUserRights = async (req, res, next) => {
  try {
    // Get all users with their assigned sites populated
    const users = await User.find({})
      .select('fullName email role designation assignedSites')
      .populate('assignedSites', 'siteName siteUniqueID');
    
    // Get all user rights with site names populated
    const userRights = await UserRight.find({})
      .populate('siteRights.site', 'siteName siteUniqueID');

    const result = users.map(user => {
      const rightRecord = userRights.find(ur => ur.user.toString() === user._id.toString());
      return {
        user: user.toObject(),
        siteRights: rightRecord ? rightRecord.siteRights : [],
        globalRights: rightRecord ? rightRecord.globalRights : []
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
    const { siteId } = req.query;
    
    let userRight = await UserRight.findOne({ user: userId })
      .populate('siteRights.site', 'siteName siteUniqueID');
    
    if (!userRight) {
      return res.json({
        success: true,
        data: { siteRights: [], globalRights: [] }
      });
    }

    if (siteId) {
      const siteRight = userRight.siteRights.find(sr => {
        const sId = sr.site?._id || sr.site;
        return sId.toString() === siteId;
      });
      return res.json({
        success: true,
        data: siteRight ? siteRight.rights : []
      });
    }

    res.json({
      success: true,
      data: {
        siteRights: userRight.siteRights,
        globalRights: userRight.globalRights
      }
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
    const { rights, siteId } = req.body; // Expects rights (array) and siteId (string or 'global')

    if (!Array.isArray(rights)) {
      return res.status(400).json({
        success: false,
        message: 'Rights must be an array of strings'
      });
    }

    let userRight = await UserRight.findOne({ user: userId });

    if (!userRight) {
      userRight = new UserRight({ user: userId, siteRights: [], globalRights: [] });
    }

    if (!siteId || siteId === 'global') {
      userRight.globalRights = rights;
    } else {
      // Find site in array
      const siteIndex = userRight.siteRights.findIndex(sr => sr.site.toString() === siteId);
      if (siteIndex > -1) {
        userRight.siteRights[siteIndex].rights = rights;
      } else {
        userRight.siteRights.push({ site: siteId, rights });
      }
    }

    await userRight.save();

    res.json({
      success: true,
      data: userRight,
      message: 'User rights updated successfully'
    });
  } catch (error) {
    next(error);
  }
};
