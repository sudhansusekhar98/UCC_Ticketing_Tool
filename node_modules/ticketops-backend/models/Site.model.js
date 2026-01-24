import mongoose from 'mongoose';

const siteSchema = new mongoose.Schema({
  siteName: {
    type: String,
    required: [true, 'Site name is required'],
    maxlength: 100,
    trim: true
  },
  siteUniqueID: {
    type: String,
    required: [true, 'Site unique ID is required'],
    unique: true,
    maxlength: 50,
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    maxlength: 100,
    trim: true
  },
  zone: {
    type: String,
    maxlength: 100,
    trim: true
  },
  ward: {
    type: String,
    maxlength: 100,
    trim: true
  },
  address: {
    type: String,
    maxlength: 500,
    trim: true
  },
  latitude: {
    type: Number,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    min: -180,
    max: 180
  },
  contactPerson: {
    type: String,
    maxlength: 100,
    trim: true
  },
  contactPhone: {
    type: String,
    maxlength: 20,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes (siteUniqueID index is already created via unique: true)
siteSchema.index({ city: 1 });
siteSchema.index({ isActive: 1 });

// Virtual for assets
siteSchema.virtual('assets', {
  ref: 'Asset',
  localField: '_id',
  foreignField: 'siteId'
});

// Virtual for assigned engineers
siteSchema.virtual('assignedEngineers', {
  ref: 'User',
  localField: '_id',
  foreignField: 'siteId'
});

export default mongoose.model('Site', siteSchema);
