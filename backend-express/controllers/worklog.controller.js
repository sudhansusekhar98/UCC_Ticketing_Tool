import DailyWorkLog, { ACTIVITY_CATEGORIES } from '../models/DailyWorkLog.model.js';
import User from '../models/User.model.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';
import fs from 'fs';

// Helper: get start of today in local time
const getToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

// Helper: parse a 'YYYY-MM-DD' string as LOCAL midnight (not UTC).
// new Date('2026-02-16') → UTC midnight, but we need local midnight
// to match dates stored by getToday() which uses setHours(0,0,0,0).
const parseLocalDate = (dateStr) => {
    // Appending T00:00:00 (without Z/offset) forces local-time parsing
    return new Date(dateStr + 'T00:00:00');
};

const parseLocalEndOfDay = (dateStr) => {
    return new Date(dateStr + 'T23:59:59.999');
};

// @desc    Get current user's work logs (paginated, date-filtered)
// @route   GET /api/worklogs/my
// @access  Private
export const getMyLogs = async (req, res, next) => {
    try {
        const { startDate, endDate, page = 1, limit = 10 } = req.query;
        const query = { userId: req.user._id };

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = parseLocalDate(startDate);
            if (endDate) query.date.$lte = parseLocalEndOfDay(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [logs, total] = await Promise.all([
            DailyWorkLog.find(query)
                .sort({ date: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('activities.ticketRef', 'ticketNumber title')
                .populate('activities.siteId', 'name code')
                .lean(),
            DailyWorkLog.countDocuments(query)
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
    } catch (err) {
        next(err);
    }
};

// @desc    Get today's log for current user
// @route   GET /api/worklogs/my/today
// @access  Private
export const getMyToday = async (req, res, next) => {
    try {
        const today = getToday();

        let log = await DailyWorkLog.findOne({ userId: req.user._id, date: today })
            .populate('activities.ticketRef', 'ticketNumber title')
            .populate('activities.siteId', 'name code')
            .lean();

        if (!log) {
            // Return an empty structure if no log exists yet
            log = {
                userId: req.user._id,
                date: today,
                activities: [],
                dailySummary: '',
                stats: {
                    ticketsCreated: 0, ticketsUpdated: 0, ticketsResolved: 0,
                    assetsAdded: 0, assetsUpdated: 0,
                    stockMovements: 0, rmaActions: 0, manualEntries: 0
                }
            };
        }

        res.json({ success: true, data: log });
    } catch (err) {
        next(err);
    }
};

// @desc    Get a specific user's logs (Admin/Supervisor)
// @route   GET /api/worklogs/user/:userId
// @access  Private (Admin, Supervisor)
export const getUserLogs = async (req, res, next) => {
    try {
        const { startDate, endDate, page = 1, limit = 10 } = req.query;
        const query = { userId: req.params.userId };

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = parseLocalDate(startDate);
            if (endDate) query.date.$lte = parseLocalEndOfDay(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [logs, total] = await Promise.all([
            DailyWorkLog.find(query)
                .sort({ date: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('activities.ticketRef', 'ticketNumber title')
                .populate('activities.siteId', 'name code')
                .lean(),
            DailyWorkLog.countDocuments(query)
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
    } catch (err) {
        next(err);
    }
};

// @desc    Get team work logs (Admin/Supervisor)
// @route   GET /api/worklogs/team
// @access  Private (Admin, Supervisor)
export const getTeamLogs = async (req, res, next) => {
    try {
        const { startDate, endDate, page = 1, limit = 20 } = req.query;
        const query = {};

        const dateFilter = {};
        if (startDate) dateFilter.$gte = parseLocalDate(startDate);
        if (endDate) dateFilter.$lte = parseLocalEndOfDay(endDate);
        if (!startDate && !endDate) {
            // Default to today
            dateFilter.$gte = getToday();
        }
        if (Object.keys(dateFilter).length) query.date = dateFilter;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [logs, total] = await Promise.all([
            DailyWorkLog.find(query)
                .sort({ date: -1, userId: 1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('userId', 'fullName role profilePicture')
                .populate('activities.ticketRef', 'ticketNumber title')
                .populate('activities.siteId', 'name code')
                .lean(),
            DailyWorkLog.countDocuments(query)
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
    } catch (err) {
        next(err);
    }
};

// @desc    Add manual activity entry
// @route   POST /api/worklogs/manual
// @access  Private
export const addManualEntry = async (req, res, next) => {
    try {
        const { category, description, duration, ticketRef, siteId, policeStation } = req.body;

        if (!category || !description) {
            return res.status(400).json({
                success: false,
                message: 'Category and description are required'
            });
        }

        // Validate category is a manual-allowed one
        const manualCategories = ['SiteVisit','Documentation', 'Upgradation', 'AdminWork', 'Coordination', 'Training', 'Investigation', 'Other'];
        if (!manualCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: `Invalid category for manual entry. Must be one of: ${manualCategories.join(', ')}`
            });
        }

        // Validate policeStation is required for Investigation category
        if (category === 'Investigation' && (!policeStation || !policeStation.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Police Station is required for Investigation entries'
            });
        }

        // Handle file uploads (photo attachments)
        const attachments = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    // Support both disk storage (file.path) and memory storage (file.buffer)
                    const uploadSource = file.path || file.buffer;
                    const uploadOptions = {
                        folder: 'worklog-attachments',
                        resource_type: 'image'
                    };
                    // If buffer, pass mimeType for proper base64 encoding
                    if (file.buffer) {
                        uploadOptions.mimeType = file.mimetype;
                    }
                    const result = await uploadToCloudinary(uploadSource, uploadOptions);
                    if (result.success && result.url) {
                        attachments.push({
                            url: result.url,
                            publicId: result.publicId
                        });
                    } else {
                        console.error('[WorkLog] Upload returned failure:', result.error);
                    }
                    // Clean up temp file if disk storage
                    if (file.path && fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                } catch (uploadErr) {
                    console.error('[WorkLog] Upload failed:', uploadErr.message);
                }
            }
        }

        const today = getToday();
        const entry = {
            type: 'manual',
            category,
            description,
            duration: duration ? parseInt(duration) : undefined,
            ticketRef: ticketRef || undefined,
            siteId: siteId || undefined,
            policeStation: category === 'Investigation' ? policeStation.trim() : undefined,
            attachments,
            timestamp: new Date()
        };

        const log = await DailyWorkLog.findOneAndUpdate(
            { userId: req.user._id, date: today },
            {
                $push: { activities: entry },
                $inc: { 'stats.manualEntries': 1 },
                $setOnInsert: { userId: req.user._id, date: today }
            },
            { upsert: true, new: true }
        );

        // Update lastActivityAt
        await User.findByIdAndUpdate(req.user._id, { lastActivityAt: new Date() });

        // Return the newly added entry
        const newEntry = log.activities[log.activities.length - 1];

        res.status(201).json({
            success: true,
            data: newEntry,
            message: 'Manual activity entry added'
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Update daily summary text
// @route   PUT /api/worklogs/summary
// @access  Private
export const updateSummary = async (req, res, next) => {
    try {
        const { summary, date } = req.body;
        const targetDate = date ? parseLocalDate(date) : getToday();

        const log = await DailyWorkLog.findOneAndUpdate(
            { userId: req.user._id, date: targetDate },
            {
                $set: { dailySummary: summary },
                $setOnInsert: { userId: req.user._id, date: targetDate }
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            data: { dailySummary: log.dailySummary },
            message: 'Daily summary updated'
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete a manual activity entry
// @route   DELETE /api/worklogs/manual/:activityId
// @access  Private
export const deleteManualEntry = async (req, res, next) => {
    try {
        const { activityId } = req.params;

        const log = await DailyWorkLog.findOne({
            userId: req.user._id,
            'activities._id': activityId,
            'activities.type': 'manual'
        });

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Manual entry not found'
            });
        }

        const activity = log.activities.id(activityId);
        if (!activity || activity.type !== 'manual') {
            return res.status(400).json({
                success: false,
                message: 'Can only delete manual entries'
            });
        }

        // Delete any Cloudinary attachments
        if (activity.attachments && activity.attachments.length > 0) {
            for (const att of activity.attachments) {
                if (att.publicId) {
                    try {
                        await deleteFromCloudinary(att.publicId);
                    } catch (e) {
                        console.error('[WorkLog] Failed to delete attachment:', e.message);
                    }
                }
            }
        }

        // Remove the activity and decrement stat
        log.activities.pull(activityId);
        if (log.stats.manualEntries > 0) {
            log.stats.manualEntries -= 1;
        }
        await log.save();

        res.json({
            success: true,
            message: 'Manual entry deleted'
        });
    } catch (err) {
        next(err);
    }
};
