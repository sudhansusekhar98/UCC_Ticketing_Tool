import mongoose from 'mongoose';
import SLAPolicy from '../models/SLAPolicy.model.js';

const PRIORITY_MAP = {
  P1: { policyName: 'Critical', field: 'critical' },
  P2: { policyName: 'High', field: 'high' },
  P3: { policyName: 'Medium', field: 'medium' },
  P4: { policyName: 'Low', field: 'low' },
};

// @desc    Get global SLA policies
// @route   GET /api/settings/sla
// @access  Private (Admin)
export const getGlobalSLA = async (req, res, next) => {
  try {
    const policies = await SLAPolicy.find({ isActive: true }).sort({ priority: 1 });
    res.json({ success: true, data: policies });
  } catch (error) {
    next(error);
  }
};

// @desc    Update global SLA policies
// @route   PUT /api/settings/sla
// @access  Private (Admin)
export const updateGlobalSLA = async (req, res, next) => {
  try {
    const { policies, enableAutoEscalation, escalationL1Time, escalationL2Time } = req.body;

    if (!Array.isArray(policies) || policies.length === 0) {
      return res.status(400).json({ success: false, message: 'policies must be a non-empty array' });
    }

    const results = [];
    for (const p of policies) {
      if (!['P1', 'P2', 'P3', 'P4'].includes(p.priority)) continue;

      const meta = PRIORITY_MAP[p.priority];
      const updated = await SLAPolicy.findOneAndUpdate(
        { priority: p.priority, isActive: true },
        {
          $set: {
            policyName: meta.policyName,
            responseTimeMinutes: p.responseTimeMinutes,
            restoreTimeMinutes: p.restoreTimeMinutes,
            escalationLevel1Minutes: p.escalationLevel1Minutes || escalationL1Time || 0,
            escalationLevel2Minutes: p.escalationLevel2Minutes || escalationL2Time || 0,
          }
        },
        { upsert: true, new: true, runValidators: true }
      );
      results.push(updated);
    }

    // Save auto-escalation setting to systemsettings
    if (enableAutoEscalation !== undefined) {
      const settingsCollection = mongoose.connection.collection('systemsettings');
      await settingsCollection.updateOne(
        { key: 'EnableAutoEscalation', category: 'SLA' },
        { $set: { key: 'EnableAutoEscalation', category: 'SLA', value: String(enableAutoEscalation), updatedAt: new Date() } },
        { upsert: true }
      );
    }

    res.json({ success: true, data: results, message: 'Global SLA policies updated successfully' });
  } catch (error) {
    next(error);
  }
};

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
