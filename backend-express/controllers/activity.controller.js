import TicketActivity from '../models/TicketActivity.model.js';
import TicketAttachment from '../models/TicketAttachment.model.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';
import path from 'path';
import fs from 'fs';

// @desc    Get activities for a ticket
// @route   GET /api/tickets/:ticketId/activities
// @access  Private
export const getActivities = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    
    const activities = await TicketActivity.find({ ticketId })
      .populate('userId', 'fullName username role')
      .sort({ createdOn: 1 }); // Sort ascending (oldest first) for chat display
    
    // Get attachments for each activity
    const activitiesWithAttachments = await Promise.all(
      activities.map(async (activity) => {
        const attachments = await TicketAttachment.find({ activityId: activity._id })
          .select('fileName contentType fileSize attachmentType filePath cloudinaryUrl uploadedOn');
        
        // Map to frontend expected format
        const mappedAttachments = attachments.map(att => ({
          attachmentId: att._id,
          fileName: att.fileName,
          contentType: att.contentType,
          fileSize: att.fileSize,
          attachmentType: att.attachmentType,
          storageType: att.cloudinaryUrl ? 'Cloudinary' : 'FileSystem',
          url: att.cloudinaryUrl || `/uploads/${att.filePath?.split(/[/\\]/).pop()}`
        }));
        
        return {
          activityId: activity._id,
          ticketId: activity.ticketId,
          userId: activity.userId?._id,
          userName: activity.userId?.fullName || 'Unknown',
          userRole: activity.userId?.role || '',
          activityType: activity.activityType,
          content: activity.content,
          isInternal: activity.isInternal,
          createdOn: activity.createdOn,
          attachments: mappedAttachments
        };
      })
    );
    
    // Also get standalone attachments (not linked to activities) and show them as activity entries
    const standaloneAttachments = await TicketAttachment.find({ 
      ticketId, 
      activityId: null 
    }).populate('uploadedBy', 'fullName role').sort({ uploadedOn: 1 });
    
    // Convert standalone attachments to activity-like entries
    const attachmentActivities = standaloneAttachments.map(att => ({
      activityId: `att-${att._id}`,
      ticketId: att.ticketId,
      userId: att.uploadedBy?._id,
      userName: att.uploadedBy?.fullName || 'Unknown',
      userRole: att.uploadedBy?.role || '',
      activityType: 'Attachment',
      content: `Uploaded: ${att.fileName}`,
      isInternal: false,
      createdOn: att.uploadedOn,
      attachments: [{
        attachmentId: att._id,
        fileName: att.fileName,
        contentType: att.contentType,
        fileSize: att.fileSize,
        attachmentType: att.attachmentType,
        storageType: att.cloudinaryUrl ? 'Cloudinary' : 'FileSystem',
        url: att.cloudinaryUrl || `/uploads/${att.filePath?.split(/[/\\]/).pop()}`
      }]
    }));
    
    // Merge and sort all activities by createdOn
    const allActivities = [...activitiesWithAttachments, ...attachmentActivities]
      .sort((a, b) => new Date(a.createdOn) - new Date(b.createdOn));
    
    res.json({
      success: true,
      data: allActivities
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create activity (add comment)
// @route   POST /api/tickets/:ticketId/activities
// @access  Private
export const createActivity = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { content, activityType = 'Comment', isInternal = false } = req.body;
    
    const activity = await TicketActivity.create({
      ticketId,
      userId: req.user._id,
      activityType,
      content,
      isInternal
    });
    
    const populatedActivity = await TicketActivity.findById(activity._id)
      .populate('userId', 'fullName username role');
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('activity:created', { ticketId, activity: populatedActivity });
    }
    
    res.status(201).json({
      success: true,
      data: {
        activityId: activity._id,
        ticketId: activity.ticketId,
        userId: populatedActivity.userId?._id,
        userName: populatedActivity.userId?.fullName,
        userRole: populatedActivity.userId?.role,
        activityType: activity.activityType,
        content: activity.content,
        isInternal: activity.isInternal,
        createdOn: activity.createdOn
      },
      message: 'Comment added successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload attachment
// @route   POST /api/tickets/:ticketId/activities/attachments
// @access  Private
export const uploadAttachment = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { activityId } = req.query;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const file = req.file;
    const isImage = file.mimetype.startsWith('image/');
    
    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(file.path, {
      folder: `ucc-ticketing/tickets/${ticketId}`,
      resourceType: isImage ? 'image' : 'auto'
    });
    
    if (!cloudinaryResult.success) {
      // If Cloudinary upload fails, fall back to local storage
      console.error('Cloudinary upload failed:', cloudinaryResult.error);
      const fileName = file.path.split(/[/\\]/).pop();
      
      const attachment = await TicketAttachment.create({
        ticketId,
        activityId: activityId || null,
        uploadedBy: req.user._id,
        fileName: file.originalname,
        contentType: file.mimetype,
        fileSize: file.size,
        storageType: 'FileSystem',
        filePath: file.path,
        attachmentType: isImage ? 'image' : 'document'
      });
      
      // Emit socket event for real-time update
      const io = req.app.get('io');
      if (io) {
        io.emit('activity:created', { ticketId, type: 'attachment', attachment });
      }
      
      return res.status(201).json({
        success: true,
        data: {
          attachmentId: attachment._id,
          fileName: attachment.fileName,
          contentType: attachment.contentType,
          fileSize: attachment.fileSize,
          attachmentType: attachment.attachmentType,
          storageType: 'FileSystem',
          url: `/uploads/${fileName}`
        },
        message: 'File uploaded to local storage'
      });
    }
    
    // Create attachment record with Cloudinary URL
    const attachment = await TicketAttachment.create({
      ticketId,
      activityId: activityId || null,
      uploadedBy: req.user._id,
      fileName: file.originalname,
      contentType: file.mimetype,
      fileSize: file.size,
      storageType: 'Cloudinary',
      filePath: cloudinaryResult.publicId,
      cloudinaryUrl: cloudinaryResult.url,
      cloudinaryPublicId: cloudinaryResult.publicId,
      attachmentType: isImage ? 'image' : 'document'
    });
    
    // Delete local file after successful Cloudinary upload
    try {
      fs.unlinkSync(file.path);
    } catch (err) {
      console.error('Failed to delete local file:', err);
    }
    
    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('activity:created', { ticketId, type: 'attachment', attachment });
    }
    
    res.status(201).json({
      success: true,
      data: {
        attachmentId: attachment._id,
        fileName: attachment.fileName,
        contentType: attachment.contentType,
        fileSize: attachment.fileSize,
        attachmentType: attachment.attachmentType,
        storageType: 'Cloudinary',
        url: cloudinaryResult.url
      },
      message: 'File uploaded to Cloudinary successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download attachment
// @route   GET /api/activities/attachments/:id/download
// @access  Private
export const downloadAttachment = async (req, res, next) => {
  try {
    const attachment = await TicketAttachment.findById(req.params.id);
    
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }
    
    // If Cloudinary, redirect to URL
    if (attachment.storageType === 'Cloudinary' && attachment.cloudinaryUrl) {
      return res.redirect(attachment.cloudinaryUrl);
    }
    
    // If FileSystem, send file
    if (attachment.storageType === 'FileSystem') {
      const filePath = path.resolve(attachment.filePath);
      if (fs.existsSync(filePath)) {
        return res.download(filePath, attachment.fileName);
      }
    }
    
    res.status(404).json({
      success: false,
      message: 'File not found'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete attachment
// @route   DELETE /api/activities/attachments/:id
// @access  Private
export const deleteAttachment = async (req, res, next) => {
  try {
    const attachment = await TicketAttachment.findById(req.params.id);
    
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }
    
    // Delete from Cloudinary if stored there
    if (attachment.storageType === 'Cloudinary' && attachment.cloudinaryPublicId) {
      try {
        await deleteFromCloudinary(attachment.cloudinaryPublicId);
      } catch (err) {
        console.error('Failed to delete from Cloudinary:', err);
      }
    }
    
    // Delete file from filesystem if exists
    if (attachment.storageType === 'FileSystem' && attachment.filePath) {
      const filePath = path.resolve(attachment.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    await attachment.deleteOne();
    
    res.json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
