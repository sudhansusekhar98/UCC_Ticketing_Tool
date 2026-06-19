import mongoose from 'mongoose';

const surveyDeviceMappingSchema = new mongoose.Schema({
  surveyItemName: {
    type: String,
    required: [true, 'Survey item name is required'],
    trim: true,
    maxlength: 200
  },
  surveyItemTypeName: {
    type: String,
    trim: true,
    maxlength: 200
  },
  internalDeviceType: {
    type: String,
    required: [true, 'Internal device type is required'],
    trim: true,
    maxlength: 100
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound unique index: same survey item name + type maps to one device type
surveyDeviceMappingSchema.index(
  { surveyItemName: 1, surveyItemTypeName: 1 },
  { unique: true }
);
surveyDeviceMappingSchema.index({ internalDeviceType: 1 });

export default mongoose.model('SurveyDeviceMapping', surveyDeviceMappingSchema);
