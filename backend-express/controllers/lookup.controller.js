import Asset from '../models/Asset.model.js';

// @desc    Get all lookups
// @route   GET /api/lookups
// @access  Private
export const getAllLookups = async (req, res, next) => {
  try {
    const [assetTypes] = await Promise.all([
      Asset.distinct('assetType')
    ]);
    
    res.json({
      success: true,
      data: {
        statuses: getStatuses(),
        priorities: getPriorities(),
        categories: getCategories(),
        assetTypes: assetTypes.length > 0 ? assetTypes : getDefaultAssetTypes(),
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
    
    res.json({
      success: true,
      data: assetTypes.length > 0 ? assetTypes : getDefaultAssetTypes()
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
    res.json({
      success: true,
      data: getAssetStatuses()
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
    { value: 'Resolved', label: 'Resolved', color: '#27ae60' },
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
    { value: 'Maintenance', label: 'Maintenance', color: '#9b59b6' }
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
