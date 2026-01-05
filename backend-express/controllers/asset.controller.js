import Asset from '../models/Asset.model.js';

// @desc    Get all assets
// @route   GET /api/assets
// @access  Private
export const getAssets = async (req, res, next) => {
  try {
    const { 
      siteId, assetType, status, criticality, isActive, 
      search, page = 1, limit = 50 
    } = req.query;
    
    const query = {};
    
    if (siteId) query.siteId = siteId;
    if (assetType) query.assetType = assetType;
    if (status) query.status = status;
    if (criticality) query.criticality = parseInt(criticality);
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { assetCode: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
        { mac: { $regex: search, $options: 'i' } },
        { locationDescription: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [assets, total] = await Promise.all([
      Asset.find(query)
        .populate('siteId', 'siteName siteUniqueID')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Asset.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: assets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single asset
// @route   GET /api/assets/:id
// @access  Private
export const getAssetById = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id)
      .populate('siteId', 'siteName siteUniqueID city address');
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    res.json({
      success: true,
      data: asset
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create asset
// @route   POST /api/assets
// @access  Private (Admin, Dispatcher)
export const createAsset = async (req, res, next) => {
  try {
    const asset = await Asset.create(req.body);
    
    const populatedAsset = await Asset.findById(asset._id)
      .populate('siteId', 'siteName siteUniqueID');
    
    res.status(201).json({
      success: true,
      data: populatedAsset,
      message: 'Asset created successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Asset with this code already exists'
      });
    }
    next(error);
  }
};

// @desc    Update asset
// @route   PUT /api/assets/:id
// @access  Private (Admin, Dispatcher)
export const updateAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('siteId', 'siteName siteUniqueID');
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    res.json({
      success: true,
      data: asset,
      message: 'Asset updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete asset
// @route   DELETE /api/assets/:id
// @access  Private (Admin)
export const deleteAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findByIdAndDelete(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Asset deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update asset status
// @route   PATCH /api/assets/:id/status
// @access  Private
export const updateAssetStatus = async (req, res, next) => {
  try {
    const { status } = req.query;
    
    const asset = await Asset.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    res.json({
      success: true,
      data: asset,
      message: 'Asset status updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get assets dropdown
// @route   GET /api/assets/dropdown
// @access  Private
export const getAssetsDropdown = async (req, res, next) => {
  try {
    const { siteId } = req.query;
    const query = { isActive: true };
    
    if (siteId) query.siteId = siteId;
    
    const assets = await Asset.find(query)
      .select('assetCode assetType locationDescription siteId')
      .populate('siteId', 'siteName')
      .sort({ assetCode: 1 });
    
    res.json({
      success: true,
      data: assets
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk import assets
// @route   POST /api/assets/import
// @access  Private (Admin)
export const bulkImportAssets = async (req, res, next) => {
  try {
    // This is a placeholder - actual implementation would parse CSV/XLSX
    res.status(501).json({
      success: false,
      message: 'Bulk import not implemented yet'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export assets
// @route   GET /api/assets/export
// @access  Private
export const exportAssets = async (req, res, next) => {
  try {
    const assets = await Asset.find({ isActive: true })
      .populate('siteId', 'siteName siteUniqueID')
      .lean();
    
    // Return as JSON for now - can be converted to CSV/XLSX
    res.json({
      success: true,
      data: assets
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download template
// @route   GET /api/assets/template
// @access  Private
export const downloadTemplate = async (req, res, next) => {
  try {
    const template = {
      headers: ['assetCode', 'assetType', 'serialNumber', 'mac', 'siteUniqueID', 'criticality', 'status'],
      example: ['AST-0001', 'Camera', 'SN123456', '00:1A:2B:3C:4D:5E', 'SITE-001', '2', 'Operational']
    };
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
};
