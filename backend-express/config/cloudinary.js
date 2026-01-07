import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dzkkf0c05',
  api_key: process.env.CLOUDINARY_API_KEY || '514424943929243',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'sxzyzxlfIqdRPlE_9Fob0Gi83wI'
});

/**
 * Upload file to Cloudinary
 * @param {string} filePath - Local file path to upload
 * @param {object} options - Upload options
 * @returns {Promise<object>} - Cloudinary upload result
 */
export const uploadToCloudinary = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: options.folder || 'ucc-ticketing/attachments',
      resource_type: options.resourceType || 'auto',
      ...options
    });
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<object>} - Deletion result
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result: result.result
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default cloudinary;
