import Notification from '../models/Notification.model.js';

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { unreadOnly, limit = 20, page = 1 } = req.query;
    
    // Build query - get user-specific notifications OR broadcast notifications
    const query = {
      $or: [
        { userId: userId },
        { isBroadcast: true }
      ],
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    };
    
    // Combined $or conditions
    const conditions = {
      $and: [
        {
          $or: [
            { userId: userId },
            { isBroadcast: true }
          ]
        },
        {
          $or: [
            { expiresAt: null },
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: new Date() } }
          ]
        }
      ]
    };
    
    if (unreadOnly === 'true') {
      conditions.$and.push({ isRead: false });
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(conditions)
        .populate('createdBy', 'fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments(conditions),
      Notification.countDocuments({
        ...conditions,
        $and: [...conditions.$and, { isRead: false }]
      })
    ]);
    
    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      unreadCount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    const count = await Notification.countDocuments({
      $and: [
        {
          $or: [
            { userId: userId },
            { isBroadcast: true }
          ]
        },
        {
          $or: [
            { expiresAt: null },
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: new Date() } }
          ]
        },
        { isRead: false }
      ]
    });
    
    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    notification.isRead = true;
    await notification.save();
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    await Notification.updateMany(
      {
        $or: [
          { userId: userId },
          { isBroadcast: true }
        ],
        isRead: false
      },
      { isRead: true }
    );
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create notification (Admin only)
// @route   POST /api/notifications
// @access  Private (Admin)
export const createNotification = async (req, res, next) => {
  try {
    const { title, message, type, link, userId, isBroadcast, expiresAt } = req.body;
    
    const notification = await Notification.create({
      title,
      message,
      type: type || 'info',
      link,
      userId: isBroadcast ? null : userId,
      isBroadcast: isBroadcast || false,
      createdBy: req.user._id,
      expiresAt
    });
    
    // Emit socket event for real-time notification
    const io = req.app.get('io');
    if (io) {
      if (isBroadcast) {
        // Broadcast to all connected users
        io.emit('notification:new', notification);
      } else if (userId) {
        // Send to specific user
        io.to(`user_${userId}`).emit('notification:new', notification);
      }
    }
    
    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notification created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    // Only allow user to delete their own notifications or admin to delete any
    if (notification.userId?.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification'
      });
    }
    
    await notification.deleteOne();
    
    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create system notification (internal use)
export const createSystemNotification = async (io, { userId, title, message, type, link, isBroadcast }) => {
  try {
    const notification = await Notification.create({
      title,
      message,
      type: type || 'system',
      link,
      userId: isBroadcast ? null : userId,
      isBroadcast: isBroadcast || false
    });
    
    if (io) {
      if (isBroadcast) {
        io.emit('notification:new', notification);
      } else if (userId) {
        io.to(`user_${userId}`).emit('notification:new', notification);
      }
    }
    
    return notification;
  } catch (error) {
    console.error('Failed to create system notification:', error);
    return null;
  }
};
