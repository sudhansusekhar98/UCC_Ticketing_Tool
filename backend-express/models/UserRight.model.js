import mongoose from 'mongoose';

const userRightSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  siteRights: [{
    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      required: true
    },
    rights: [{
      type: String,
      trim: true
    }]
  }],
  globalRights: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

userRightSchema.index({ user: 1 });
userRightSchema.index({ 'siteRights.site': 1 });

export default mongoose.model('UserRight', userRightSchema);
