import mongoose from 'mongoose';

/**
 * DeviceType Model
 * Stores the relationship between AssetTypes and their associated DeviceTypes
 * Example: AssetType "Camera" can have DeviceTypes like "Bullet Camera", "PTZ", "ALPT", "Dome", etc.
 */
const deviceTypeSchema = new mongoose.Schema({
  assetType: {
    type: String,
    required: [true, 'Asset Type is required'],
    trim: true,
    maxlength: 50
  },
  deviceType: {
    type: String,
    required: [true, 'Device Type is required'],
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 200,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique device type per asset type
deviceTypeSchema.index({ assetType: 1, deviceType: 1 }, { unique: true });

// Index for faster lookups
deviceTypeSchema.index({ assetType: 1, isActive: 1 });

export default mongoose.model('DeviceType', deviceTypeSchema);
