import mongoose from 'mongoose';

// @desc    Get all settings
// @route   GET /api/settings
// @access  Private (Admin)
export const getSettings = async (req, res, next) => {
  try {
    const settingsCollection = mongoose.connection.collection('systemsettings');
    const settings = await settingsCollection.find({}).toArray();
    
    // Group by category and convert to key-value pairs
    const groupedSettings = settings.reduce((acc, setting) => {
      const category = setting.category || 'General';
      if (!acc[category]) acc[category] = {};
      acc[category][setting.key] = setting.value;
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: groupedSettings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get settings by category
// @route   GET /api/settings/:category
// @access  Private
export const getSettingsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const settingsCollection = mongoose.connection.collection('systemsettings');
    const settings = await settingsCollection.find({ category }).toArray();
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update settings
// @route   PUT /api/settings
// @access  Private (Admin)
export const updateSettings = async (req, res, next) => {
  try {
    const settingsPayload = req.body;
    const settingsCollection = mongoose.connection.collection('systemsettings');
    
    // Handle grouped category format: { General: {key: value}, Notifications: {...} }
    for (const [category, settings] of Object.entries(settingsPayload)) {
      if (typeof settings !== 'object' || settings === null) continue;
      
      for (const [key, value] of Object.entries(settings)) {
        await settingsCollection.updateOne(
          { key, category },
          { 
            $set: { 
              key,
              category,
              value: typeof value === 'string' ? value : String(value),
              updatedAt: new Date()
            } 
          },
          { upsert: true }
        );
      }
    }
    
    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update single setting
// @route   PATCH /api/settings/:category/:key
// @access  Private (Admin)
export const updateSingleSetting = async (req, res, next) => {
  try {
    const { category, key } = req.params;
    const { value } = req.body;
    
    const settingsCollection = mongoose.connection.collection('systemsettings');
    await settingsCollection.updateOne(
      { key, category },
      { 
        $set: { 
          value,
          updatedAt: new Date()
        } 
      }
    );
    
    res.json({
      success: true,
      message: 'Setting updated successfully'
    });
  } catch (error) {
    next(error);
  }
};
