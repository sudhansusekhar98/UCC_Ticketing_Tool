import Asset from '../models/Asset.model.js';
import DeviceType from '../models/DeviceType.model.js';

// @desc    Get all lookups
// @route   GET /api/lookups
// @access  Private
export const getAllLookups = async (req, res, next) => {
  try {
    const [assetTypes] = await Promise.all([
      Asset.distinct('assetType')
    ]);

    // Format asset types consistently
    const formattedAssetTypes = assetTypes.length > 0
      ? assetTypes.filter(type => type).map(type => ({ value: type, label: type }))
      : getDefaultAssetTypes();

    res.json({
      success: true,
      data: {
        statuses: getStatuses(),
        priorities: getPriorities(),
        categories: getCategories(),
        assetTypes: formattedAssetTypes,
        assetStatuses: getAssetStatuses(),
        roles: getRoles()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get ticket statuses
// @route   GET /api/lookups/statuses
// @access  Private
export const getStatusesEndpoint = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: getStatuses()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get priorities
// @route   GET /api/lookups/priorities
// @access  Private
export const getPrioritiesEndpoint = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: getPriorities()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get categories
// @route   GET /api/lookups/categories
// @access  Private
export const getCategoriesEndpoint = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: getCategories()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get asset types
// @route   GET /api/lookups/asset-types
// @access  Private
export const getAssetTypesEndpoint = async (req, res, next) => {
  try {
    // Get unique asset types from database
    const assetTypes = await Asset.distinct('assetType');

    // Always return in consistent { value, label } format
    const formattedTypes = assetTypes.length > 0
      ? assetTypes.filter(type => type).map(type => ({ value: type, label: type }))
      : getDefaultAssetTypes();

    res.json({
      success: true,
      data: formattedTypes
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get asset statuses
// @route   GET /api/lookups/asset-statuses
// @access  Private
export const getAssetStatusesEndpoint = async (req, res, next) => {
  try {
    // Get unique statuses from database
    const statuses = await Asset.distinct('status');

    // Map to status objects with colors
    const statusColors = {
      'Operational': '#27ae60',
      'Degraded': '#f39c12',
      'Offline': '#e74c3c',
      'Maintenance': '#9b59b6',
      'Not Installed': '#7f8c8d'
    };

    const formattedStatuses = statuses.length > 0
      ? statuses.filter(s => s && s !== 'Spare').map(s => ({
        value: s,
        label: s,
        color: statusColors[s] || '#7f8c8d'
      }))
      : getAssetStatuses();

    res.json({
      success: true,
      data: formattedStatuses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get roles
// @route   GET /api/lookups/roles
// @access  Private
export const getRolesEndpoint = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: getRoles()
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
function getStatuses() {
  return [
    { value: 'Open', label: 'Open', color: '#3498db' },
    { value: 'Assigned', label: 'Assigned', color: '#9b59b6' },
    { value: 'Acknowledged', label: 'Acknowledged', color: '#f39c12' },
    { value: 'InProgress', label: 'In Progress', color: '#e67e22' },
    { value: 'OnHold', label: 'On Hold', color: '#95a5a6' },
    { value: 'Escalated', label: 'Escalated', color: '#e74c3c' },
    { value: 'Resolved', label: 'Resolved', color: '#27ae60' },
    { value: 'ResolutionRejected', label: 'Resolution Rejected', color: '#d35400' },
    { value: 'Verified', label: 'Verified', color: '#2ecc71' },
    { value: 'Closed', label: 'Closed', color: '#1abc9c' },
    { value: 'Cancelled', label: 'Cancelled', color: '#e74c3c' }
  ];
}

function getPriorities() {
  return [
    { value: 'P1', label: 'P1 - Critical', color: '#e74c3c' },
    { value: 'P2', label: 'P2 - High', color: '#e67e22' },
    { value: 'P3', label: 'P3 - Medium', color: '#f39c12' },
    { value: 'P4', label: 'P4 - Low', color: '#3498db' }
  ];
}

function getCategories() {
  return [
    { value: 'Hardware', label: 'Hardware' },
    { value: 'Software', label: 'Software' },
    { value: 'Network', label: 'Network' },
    { value: 'Power', label: 'Power' },
    { value: 'Connectivity', label: 'Connectivity' },
    { value: 'Other', label: 'Other' }
  ];
}

function getDefaultAssetTypes() {
  return [
    { value: 'Camera', label: 'Camera' },
    { value: 'NVR', label: 'NVR' },
    { value: 'Switch', label: 'Switch' },
    { value: 'Router', label: 'Router' },
    { value: 'Server', label: 'Server' },
    { value: 'Other', label: 'Other' }
  ];
}

function getAssetStatuses() {
  return [
    { value: 'Operational', label: 'Operational', color: '#27ae60' },
    { value: 'Degraded', label: 'Degraded', color: '#f39c12' },
    { value: 'Offline', label: 'Offline', color: '#e74c3c' },
    { value: 'Maintenance', label: 'Maintenance', color: '#9b59b6' },
    { value: 'Not Installed', label: 'Not Installed', color: '#7f8c8d' }
  ];
}

function getRoles() {
  return [
    { value: 'Admin', label: 'Administrator' },
    { value: 'Supervisor', label: 'Supervisor' },
    { value: 'Dispatcher', label: 'Dispatcher' },
    { value: 'L1Engineer', label: 'L1 Engineer' },
    { value: 'L2Engineer', label: 'L2 Engineer' },
    { value: 'ClientViewer', label: 'Client Viewer' }
  ];
}

// @desc    Get device types by asset type (from Assets collection)
// @route   GET /api/lookups/device-types
// @access  Private
export const getDeviceTypesEndpoint = async (req, res, next) => {
  try {
    const { assetType } = req.query;

    let query = {};
    if (assetType) {
      query.assetType = assetType;
    }

    // Get distinct device types from Assets collection
    const deviceTypes = await Asset.distinct('deviceType', query);

    // Format for dropdown - filter out null/empty values
    const formatted = deviceTypes
      .filter(dt => dt && dt.trim() !== '')
      .sort()
      .map(dt => ({
        value: dt,
        label: dt
      }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get models by asset type and device type (from Assets collection)
// @route   GET /api/lookups/models
// @access  Private
export const getModelsEndpoint = async (req, res, next) => {
  try {
    const { assetType, deviceType } = req.query;

    let query = {};
    if (assetType) {
      query.assetType = assetType;
    }
    if (deviceType) {
      query.deviceType = deviceType;
    }

    // Get distinct models from Assets collection
    const models = await Asset.distinct('model', query);

    // Format for dropdown - filter out null/empty values
    const formatted = models
      .filter(m => m && m.trim() !== '')
      .sort()
      .map(m => ({
        value: m,
        label: m
      }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all device types grouped by asset type (from Assets collection)
// @route   GET /api/lookups/device-types/all
// @access  Private
export const getAllDeviceTypesEndpoint = async (req, res, next) => {
  try {
    // Aggregate to get unique assetType + deviceType combinations from Assets
    const results = await Asset.aggregate([
      { $match: { deviceType: { $ne: null, $ne: '' } } },
      { $group: { _id: { assetType: '$assetType', deviceType: '$deviceType' } } },
      { $sort: { '_id.assetType': 1, '_id.deviceType': 1 } }
    ]);

    // Group by asset type
    const grouped = results.reduce((acc, item) => {
      const { assetType, deviceType } = item._id;
      if (!acc[assetType]) {
        acc[assetType] = [];
      }
      acc[assetType].push({
        value: deviceType,
        label: deviceType
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new device type
// @route   POST /api/lookups/device-types
// @access  Private (Admin)
export const createDeviceTypeEndpoint = async (req, res, next) => {
  try {
    const { assetType, deviceType, description } = req.body;

    if (!assetType || !deviceType) {
      return res.status(400).json({
        success: false,
        message: 'Asset Type and Device Type are required'
      });
    }

    const newDeviceType = await DeviceType.create({
      assetType,
      deviceType,
      description
    });

    res.status(201).json({
      success: true,
      data: newDeviceType,
      message: 'Device Type created successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This Device Type already exists for the selected Asset Type'
      });
    }
    next(error);
  }
};

// @desc    Delete a device type
// @route   DELETE /api/lookups/device-types/:id
// @access  Private (Admin)
export const deleteDeviceTypeEndpoint = async (req, res, next) => {
  try {
    const deviceType = await DeviceType.findByIdAndDelete(req.params.id);

    if (!deviceType) {
      return res.status(404).json({
        success: false,
        message: 'Device Type not found'
      });
    }

    res.json({
      success: true,
      message: 'Device Type deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Seed default device types
// @route   POST /api/lookups/device-types/seed
// @access  Private (Admin)
export const seedDeviceTypesEndpoint = async (req, res, next) => {
  try {
    const defaultDeviceTypes = getDefaultDeviceTypes();

    let created = 0;
    let skipped = 0;

    for (const dt of defaultDeviceTypes) {
      try {
        await DeviceType.create(dt);
        created++;
      } catch (err) {
        if (err.code === 11000) {
          skipped++; // Already exists
        }
      }
    }

    res.json({
      success: true,
      message: `Seeded device types. Created: ${created}, Skipped (already exist): ${skipped}`
    });
  } catch (error) {
    next(error);
  }
};

// Default device types mapping
function getDefaultDeviceTypes() {
  return [
    // Camera types
    { assetType: 'Camera', deviceType: 'Bullet Camera' },
    { assetType: 'Camera', deviceType: 'PTZ Camera' },
    { assetType: 'Camera', deviceType: 'Dome Camera' },
    { assetType: 'Camera', deviceType: 'ALPT' },
    { assetType: 'Camera', deviceType: 'Box Camera' },
    { assetType: 'Camera', deviceType: 'Thermal Camera' },
    { assetType: 'Camera', deviceType: 'Panoramic Camera' },
    { assetType: 'Camera', deviceType: 'ANPR Camera' },
    { assetType: 'Camera', deviceType: 'Fish Eye Camera' },

    // NVR types
    { assetType: 'NVR', deviceType: 'Standard NVR' },
    { assetType: 'NVR', deviceType: 'Enterprise NVR' },
    { assetType: 'NVR', deviceType: 'Edge NVR' },

    // Switch types
    { assetType: 'Switch', deviceType: 'PoE Switch' },
    { assetType: 'Switch', deviceType: 'Managed Switch' },
    { assetType: 'Switch', deviceType: 'Unmanaged Switch' },
    { assetType: 'Switch', deviceType: 'Layer 3 Switch' },

    // Router types
    { assetType: 'Router', deviceType: 'Edge Router' },
    { assetType: 'Router', deviceType: 'Core Router' },
    { assetType: 'Router', deviceType: 'Wireless Router' },

    // Server types
    { assetType: 'Server', deviceType: 'VMS Server' },
    { assetType: 'Server', deviceType: 'NMS Server' },
    { assetType: 'Server', deviceType: 'Storage Server' },
    { assetType: 'Server', deviceType: 'Application Server' },

    // Other types
    { assetType: 'Other', deviceType: 'UPS' },
    { assetType: 'Other', deviceType: 'Media Converter' },
    { assetType: 'Other', deviceType: 'OFC' },
    { assetType: 'Other', deviceType: 'Junction Box' }
  ];
}
