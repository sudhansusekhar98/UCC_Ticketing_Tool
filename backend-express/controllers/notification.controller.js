import Notification from '../models/Notification.model.js';
import User from '../models/User.model.js';
import DailyWorkLog from '../models/DailyWorkLog.model.js';
import { logNotification } from '../utils/notificationLogger.js';
import emailUtils from '../utils/email.utils.js';
const { sendGeneralNotificationEmail } = emailUtils;

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
            { isBroadcast: true },
            { targetRoles: req.user.role }
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
            { isBroadcast: true },
            { targetRoles: req.user.role }
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
    const { title, message, type, link, userId, isBroadcast, targetRoles, expiresAt } = req.body;

    const notification = await Notification.create({
      title,
      message,
      type: type || 'info',
      link,
      userId: (isBroadcast || (targetRoles && targetRoles.length > 0)) ? null : userId,
      isBroadcast: isBroadcast || false,
      targetRoles: isBroadcast ? [] : (targetRoles || []),
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

    // Log the system notification
    try {
      let recipientStr = isBroadcast ? 'All Users' : 'Unknown User';
      if (!isBroadcast && userId) {
        const targetUser = await User.findById(userId).select('email fullName');
        if (targetUser) recipientStr = targetUser.email || targetUser.fullName;
      }

      await logNotification(
        recipientStr,
        title,
        message,
        'Other',
        null,
        'Sent',
        null,
        isBroadcast ? null : userId,
        'System'
      );
    } catch (err) {
      console.error('Failed to log system notification:', err);
    }

    // Send email if requested
    if (req.body.sendEmail) {
      try {
        let recipients = [];
        if (isBroadcast) {
          // Fetch all users with email
          recipients = await User.find({
            email: { $exists: true, $ne: '' }
          }).select('email fullName');
        } else if (targetRoles && targetRoles.length > 0) {
          // Fetch users with matching roles
          recipients = await User.find({
            role: { $in: targetRoles },
            email: { $exists: true, $ne: '' }
          }).select('email fullName');
        } else if (userId) {
          const targetUser = await User.findById(userId).select('email fullName');
          if (targetUser && targetUser.email) {
            recipients = [targetUser];
          }
        }

        if (recipients.length > 0) {
          await sendGeneralNotificationEmail(recipients, notification);
        }
      } catch (emailErr) {
        console.error('Failed to send notification emails:', emailErr);
      }
    }


    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notification created successfully'
    });

    // Fire-and-forget: auto-track
    DailyWorkLog.logActivity(req.user._id, {
      category: 'NotificationCreated',
      description: `Created notification: "${title}"${isBroadcast ? ' (Broadcast)' : ''}`,
      metadata: { title, isBroadcast: isBroadcast || false, type: type || 'info' }
    }).catch(() => { });
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



    try {
      let recipientStr = isBroadcast ? 'All Users' : 'Unknown User';
      if (!isBroadcast && userId) {
        const targetUser = await User.findById(userId).select('email fullName');
        if (targetUser) recipientStr = targetUser.email || targetUser.fullName;
      }

      await logNotification(
        recipientStr,
        title,
        message,
        'Other',
        null,
        'Sent',
        null,
        isBroadcast ? null : userId,
        'System'
      );
    } catch (err) {
      console.error('Failed to log internal system notification:', err);
    }

    return notification;
  } catch (error) {
    console.error('Failed to create system notification:', error);
    return null;
  }
};

import NotificationLog from '../models/NotificationLog.model.js';

// @desc    Get notification logs (Admin only)
// @route   GET /api/notifications/logs
// @access  Private (Admin)
export const getNotificationLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, type, search } = req.query;

    const query = {};
    if (category) query.category = category;
    if (type) query.type = type;

    if (search) {
      query.$or = [
        { recipient: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      NotificationLog.find(query)
        .sort({ sentAt: -1 })
        .populate('recipientId', 'fullName username')
        .skip(skip)
        .limit(parseInt(limit)),
      NotificationLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: logs,
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

// @desc    Get single notification
// @route   GET /api/notifications/:id
// @access  Private
export const getNotificationById = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('createdBy', 'fullName');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Only allow user to view their own notifications or broadcast/role-based notifications
    const isOwner = notification.userId && notification.userId.toString() === req.user._id.toString();
    const isTargetedByRole = notification.targetRoles && notification.targetRoles.includes(req.user.role);

    if (!isOwner && !notification.isBroadcast && !isTargetedByRole) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this notification'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};
