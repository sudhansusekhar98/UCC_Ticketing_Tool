import User from '../models/User.model.js';
import UserRight from '../models/UserRight.model.js';
import DailyWorkLog from '../models/DailyWorkLog.model.js';
import { hashPassword } from '../utils/auth.utils.js';
import { sendAccountCreationEmail, sendPasswordResetEmail } from '../utils/email.utils.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin)
export const getUsers = async (req, res, next) => {
  try {
    const { role, siteId, isActive, search, page = 1, limit = 50 } = req.query;

    const query = {};
    const user = req.user;

    // Restrict non-admins to their assigned sites
    if (user.role !== 'Admin') {
      if (!user.assignedSites || user.assignedSites.length === 0) {
        return res.json({
          success: true,
          data: [],
          pagination: { page: 1, limit: parseInt(limit), total: 0, pages: 0 }
        });
      }
      query.assignedSites = { $in: user.assignedSites };
    }

    if (role) query.role = role;
    if (siteId) query.siteId = siteId;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash')
        .populate('siteId', 'siteName siteUniqueID')
        .populate('assignedSites', 'siteName siteUniqueID')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin)
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash')
      .populate('siteId', 'siteName siteUniqueID city')
      .populate('assignedSites', 'siteName siteUniqueID city');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create user
// @route   POST /api/users
// @access  Private (Admin)
export const createUser = async (req, res, next) => {
  try {
    const { password, ...userData } = req.body;

    // Store temporary password for email
    const tempPassword = password || 'DefaultPass@123';

    // Hash password
    const passwordHash = await hashPassword(tempPassword);

    const user = await User.create({
      ...userData,
      passwordHash
    });

    // Send welcome email with credentials
    if (user.email) {
      await sendAccountCreationEmail(user, tempPassword);
    }

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.passwordHash;

    res.status(201).json({
      success: true,
      data: userResponse,
      message: 'User created successfully. Welcome email has been sent.'
    });

    // Fire-and-forget: auto-track
    DailyWorkLog.logActivity(req.user._id, {
      category: 'UserCreated',
      description: `Created user ${user.fullName} (${user.role})`,
      metadata: { userName: user.fullName, userRole: user.role, userId: user._id }
    }).catch(() => { });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `User with this ${field} already exists`
      });
    }
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
export const updateUser = async (req, res, next) => {
  try {
    const { password, ...userData } = req.body;

    // If password is provided, hash it
    if (password) {
      userData.passwordHash = await hashPassword(password);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...userData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });

    // Fire-and-forget: auto-track
    DailyWorkLog.logActivity(req.user._id, {
      category: 'UserUpdated',
      description: `Updated user ${user.fullName}`,
      metadata: { userName: user.fullName, userId: user._id }
    }).catch(() => { });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

    // Fire-and-forget: auto-track
    DailyWorkLog.logActivity(req.user._id, {
      category: 'UserDeleted',
      description: `Deleted user ${user.fullName}`,
      metadata: { userName: user.fullName, userId: user._id }
    }).catch(() => { });
  } catch (error) {
    next(error);
  }
};

// @desc    Get users dropdown
// @route   GET /api/users/dropdown
// @access  Private
export const getUsersDropdown = async (req, res, next) => {
  try {
    const { role } = req.query;
    const query = { isActive: true };

    if (role) query.role = role;

    if (req.user.role !== 'Admin') {
      if (!req.user.assignedSites || req.user.assignedSites.length === 0) return res.json({ success: true, data: [] });
      query.assignedSites = { $in: req.user.assignedSites };
    }

    const users = await User.find(query)
      .select('fullName username role')
      .sort({ fullName: 1 });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get engineers
// @route   GET /api/users/engineers
// @access  Private
export const getEngineers = async (req, res, next) => {
  try {
    let engineerQuery = {
      role: { $in: ['L1Engineer', 'L2Engineer'] },
      isActive: true
    };

    if (req.user.role !== 'Admin') {
      if (req.user.assignedSites && req.user.assignedSites.length > 0) {
        engineerQuery.assignedSites = { $in: req.user.assignedSites };
      } else {
        return res.json({ success: true, data: [] });
      }
    }

    const engineers = await User.find(engineerQuery)
      .select('fullName username role siteId assignedSites mobileNumber')
      .populate('siteId', 'siteName')
      .populate('assignedSites', 'siteName')
      .sort({ fullName: 1 });

    res.json({
      success: true,
      data: engineers
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Get contacts (supervisors and above)
// @route   GET /api/users/contacts
// @access  Private
export const getContacts = async (req, res, next) => {
  try {
    const contacts = await User.find({
      isActive: true
    })
      .select('fullName username role email mobileNumber')
      .sort({ role: 1, fullName: 1 });

    res.json({
      success: true,
      data: contacts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Activate user
// @route   PUT /api/users/:id/activate
// @access  Private (Admin)
export const activateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user,
      message: 'User activated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate user
// @route   PUT /api/users/:id/deactivate
// @access  Private (Admin)
export const deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset user password
// @route   PUT /api/users/:id/reset-password
// @access  Private (Admin)
export const resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    // Store new password for email
    const resetPassword = newPassword || 'Reset@123';

    const passwordHash = await hashPassword(resetPassword);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { passwordHash },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Send password reset email
    if (user.email) {
      await sendPasswordResetEmail(user, resetPassword);
    }

    res.json({
      success: true,
      message: 'Password reset successfully. Email notification has been sent.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get users with escalation rights
// @route   GET /api/users/escalation-users
// @access  Private
export const getEscalationUsers = async (req, res, next) => {
  try {
    const { siteId, level } = req.query;

    // Determine which rights to look for based on level
    let escalationRights = ['ESCALATION_L1', 'ESCALATION_L2', 'ESCALATION_L3'];
    if (level) {
      escalationRights = [`ESCALATION_L${level}`];
    }

    let query = {
      $or: [
        { globalRights: { $in: escalationRights } },
        { 'siteRights.rights': { $in: escalationRights } }
      ]
    };

    const userRights = await UserRight.find(query).select('user');
    const userIds = userRights.map(ur => ur.user);

    const users = await User.find({
      _id: { $in: userIds },
      isActive: true
    })
      .select('fullName username role siteId assignedSites')
      .sort({ fullName: 1 });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};
