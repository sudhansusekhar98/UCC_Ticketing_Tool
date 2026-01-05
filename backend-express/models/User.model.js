import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    maxlength: 100,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 100
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    maxlength: 50
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: ['Dispatcher', 'L1Engineer', 'L2Engineer', 'Supervisor', 'Admin', 'ClientViewer'],
    default: 'L1Engineer'
  },
  mobileNumber: {
    type: String,
    maxlength: 20,
    trim: true
  },
  designation: {
    type: String,
    maxlength: 100,
    trim: true
  },
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginOn: {
    type: Date
  },
  refreshToken: {
    type: String,
    select: false
  },
  refreshTokenExpiry: {
    type: Date,
    select: false
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance (email and username already have unique indexes)
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Virtual for assigned tickets
userSchema.virtual('assignedTickets', {
  ref: 'Ticket',
  localField: '_id',
  foreignField: 'assignedTo'
});

// Virtual for created tickets
userSchema.virtual('createdTickets', {
  ref: 'Ticket',
  localField: '_id',
  foreignField: 'createdBy'
});

// Constants
export const UserRoles = {
  DISPATCHER: 'Dispatcher',
  L1_ENGINEER: 'L1Engineer',
  L2_ENGINEER: 'L2Engineer',
  SUPERVISOR: 'Supervisor',
  ADMIN: 'Admin',
  CLIENT_VIEWER: 'ClientViewer'
};

export default mongoose.model('User', userSchema);
