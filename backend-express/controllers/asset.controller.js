import Asset from '../models/Asset.model.js';
import Site from '../models/Site.model.js';
import XLSX from 'xlsx';
import fs from 'fs';

// Helper to build asset query based on filters and user permissions
const buildAssetQuery = (req) => {
  const {
    siteId, assetType, status, criticality, isActive, locationName,
    search
  } = req.query;

  const query = {};
  const user = req.user;

  // Site filtering logic - explicit siteId takes precedence
  if (siteId) {
    // For non-admins, validate they have access to this site
    if (user.role !== 'Admin') {
      const hasAccess = user.assignedSites?.some(s => s.toString() === siteId);
      if (!hasAccess) {
        return { error: 'Access denied to this site' };
      }
    }
    query.siteId = siteId;
  } else if (user.role !== 'Admin') {
    // No specific siteId - restrict non-admins to their assigned sites
    if (!user.assignedSites || user.assignedSites.length === 0) {
      return { empty: true };
    }
    query.siteId = { $in: user.assignedSites };
  }

  if (locationName) query.locationName = locationName;
  if (assetType) query.assetType = assetType;

  // By default, exclude Spare assets from general asset lists
  if (status) {
    query.status = status;
  } else {
    query.status = { $ne: 'Spare' };
  }

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

  return { query };
};

// @desc    Get all assets
// @route   GET /api/assets
// @access  Private
export const getAssets = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const { query, empty, error } = buildAssetQuery(req);

    if (error) {
      return res.status(403).json({ success: false, message: error });
    }

    if (empty) {
      return res.json({
        success: true,
        data: [],
        pagination: { page: 1, limit: parseInt(limit), total: 0, pages: 0 }
      });
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
    const query = { _id: req.params.id };

    // Non-admins can only update assets of their own site
    if (req.user.role !== 'Admin') {
      query.siteId = req.user.siteId;
    }

    const asset = await Asset.findOneAndUpdate(
      query,
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
    const query = { _id: req.params.id };
    if (req.user.role !== 'Admin') {
      query.siteId = req.user.siteId;
    }

    const asset = await Asset.findOneAndDelete(query);

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
    const { siteId, assetType } = req.query;
    const query = {};

    if (req.user.role !== 'Admin') {
      if (!req.user.assignedSites || req.user.assignedSites.length === 0) {
        return res.json({ success: true, data: [] });
      }
      if (siteId && req.user.assignedSites.some(s => s.toString() === siteId)) {
        query.siteId = siteId;
      } else if (siteId) {
        return res.json({ success: true, data: [] });
      } else {
        query.siteId = { $in: req.user.assignedSites };
      }
    } else if (siteId) {
      query.siteId = siteId;
    }

    if (assetType) {
      query.assetType = assetType;
    }

    // Exclude Spares from dropdowns
    query.status = { $ne: 'Spare' };

    const assets = await Asset.find(query)
      .select('assetCode assetType deviceType locationName locationDescription siteId criticality')
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

// @desc    Get distinct location names for a site
// @route   GET /api/assets/locations
// @access  Private
export const getLocationNames = async (req, res, next) => {
  try {
    const { siteId } = req.query;
    const query = {};

    if (req.user.role !== 'Admin') {
      if (!req.user.assignedSites || req.user.assignedSites.length === 0) {
        return res.json({ success: true, data: [] });
      }
      if (siteId && req.user.assignedSites.some(s => s.toString() === siteId)) {
        query.siteId = siteId;
      } else if (siteId) {
        return res.json({ success: true, data: [] });
      } else {
        query.siteId = { $in: req.user.assignedSites };
      }
    } else if (siteId) {
      query.siteId = siteId;
    }

    // Exclude Spare assets from location lookups
    query.status = { $ne: 'Spare' };

    const locationNames = await Asset.distinct('locationName', {
      ...query,
      locationName: { $exists: true, $ne: '', $ne: null }
    });

    const sortedLocations = locationNames.filter(Boolean).sort();

    res.json({
      success: true,
      data: sortedLocations.map(name => ({ value: name, label: name }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get distinct asset types for a site
export const getAssetTypesForSite = async (req, res, next) => {
  try {
    const { siteId, locationName } = req.query;
    const query = {};

    if (req.user.role !== 'Admin') {
      if (!req.user.assignedSites || req.user.assignedSites.length === 0) {
        return res.json({ success: true, data: [] });
      }
      if (siteId && req.user.assignedSites.some(s => s.toString() === siteId)) {
        query.siteId = siteId;
      } else if (siteId) {
        return res.json({ success: true, data: [] });
      } else {
        query.siteId = { $in: req.user.assignedSites };
      }
    } else if (siteId) {
      query.siteId = siteId;
    }

    if (locationName) query.locationName = locationName;

    // Exclude Spare assets
    query.status = { $ne: 'Spare' };

    const assetTypes = await Asset.distinct('assetType', query);
    const sortedTypes = assetTypes.filter(Boolean).sort();

    res.json({
      success: true,
      data: sortedTypes.map(type => ({ value: type, label: type }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get distinct device types for a site
export const getDeviceTypesForSite = async (req, res, next) => {
  try {
    const { siteId, locationName, assetType } = req.query;
    const query = {};

    if (req.user.role !== 'Admin') {
      if (!req.user.assignedSites || req.user.assignedSites.length === 0) {
        return res.json({ success: true, data: [] });
      }
      if (siteId && req.user.assignedSites.some(s => s.toString() === siteId)) {
        query.siteId = siteId;
      } else if (siteId) {
        return res.json({ success: true, data: [] });
      } else {
        query.siteId = { $in: req.user.assignedSites };
      }
    } else if (siteId) {
      query.siteId = siteId;
    }

    if (locationName) query.locationName = locationName;
    if (assetType) query.assetType = assetType;

    // Exclude Spare assets
    query.status = { $ne: 'Spare' };

    const deviceTypes = await Asset.distinct('deviceType', query);
    const sortedTypes = deviceTypes.filter(Boolean).sort();

    res.json({
      success: true,
      data: sortedTypes.map(type => ({ value: type, label: type }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk import assets
// @route   POST /api/assets/import
export const bulkImportAssets = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel or CSV file' });
    }

    let workbook;
    const isMemoryStorage = !!req.file.buffer;

    if (isMemoryStorage) {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    } else {
      const fileBuffer = fs.readFileSync(req.file.path);
      workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });

    if (!isMemoryStorage && req.file.path) {
      try {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      } catch (e) { console.error('Error deleting file:', e); }
    }

    const result = {
      total: data.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    const normalizeKey = key => key ? key.toString().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const toString = (val) => (val === null || val === undefined || val === '') ? undefined : String(val).trim();
    const toInt = (val, defaultVal = undefined) => {
      if (val === null || val === undefined || val === '') return defaultVal;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? defaultVal : parsed;
    };
    const toDate = (val) => {
      if (val === null || val === undefined || val === '') return undefined;
      if (typeof val === 'number') return new Date((val - 25569) * 86400 * 1000);
      const date = new Date(val);
      return isNaN(date.getTime()) ? undefined : date;
    };
    const toBool = (val, defaultVal = true) => {
      if (val === null || val === undefined || val === '') return defaultVal;
      const str = String(val).toLowerCase().trim();
      if (['true', '1', 'yes', 'y', 'active'].includes(str)) return true;
      if (['false', '0', 'no', 'n', 'inactive'].includes(str)) return false;
      return defaultVal;
    };

    const validStatuses = Asset.schema.path('status').enumValues || ['Operational', 'Degraded', 'Offline', 'Maintenance', 'Not Installed'];

    for (const [index, row] of data.entries()) {
      try {
        const normalizedRow = {};
        Object.keys(row).forEach(key => {
          normalizedRow[normalizeKey(key)] = row[key];
        });

        const siteUniqueId = toString(normalizedRow['siteid']) || toString(normalizedRow['siteuniqueid']);
        if (!siteUniqueId) throw new Error('SiteId is missing');

        const site = await Site.findOne({ siteUniqueID: siteUniqueId });
        if (!site) throw new Error(`Site '${siteUniqueId}' not found`);

        const assetCode = toString(normalizedRow['assetcode']);
        const assetType = toString(normalizedRow['assettype']) || toString(normalizedRow['devicetype']);
        if (!assetCode) throw new Error('Asset Code is missing');
        if (!assetType) throw new Error('Asset Type is missing');

        let criticality = toInt(normalizedRow['criticality'], 2);
        if (![1, 2, 3].includes(criticality)) criticality = 2;

        let status = toString(normalizedRow['status']) || 'Operational';
        const matchedStatus = validStatuses.find(s => s.toLowerCase() === status.toLowerCase());
        status = matchedStatus || 'Operational';

        const assetData = {
          assetCode,
          assetType,
          siteId: site._id,
          serialNumber: toString(normalizedRow['serialnumber']) || toString(normalizedRow['serialno']),
          mac: toString(normalizedRow['mac']) || toString(normalizedRow['macaddress']),
          ipAddress: toString(normalizedRow['ipaddress']) || toString(normalizedRow['ip']) || toString(normalizedRow['managementip']),
          locationDescription: toString(normalizedRow['locationdescription']) || toString(normalizedRow['location']),
          locationName: toString(normalizedRow['locationname']) || toString(normalizedRow['location']) || toString(normalizedRow['locationdescription']),
          make: toString(normalizedRow['make']) || toString(normalizedRow['brand']),
          model: toString(normalizedRow['model']),
          deviceType: toString(normalizedRow['devicetype']),
          usedFor: toString(normalizedRow['usedfor']),
          userName: toString(normalizedRow['username']),
          password: toString(normalizedRow['password']),
          remark: toString(normalizedRow['remark']),
          criticality,
          status,
          installationDate: toDate(normalizedRow['installationdate']),
          warrantyEndDate: toDate(normalizedRow['warrantyenddate']),
          isActive: toBool(normalizedRow['isactive'], true)
        };

        Object.keys(assetData).forEach(key => {
          if (assetData[key] === undefined) delete assetData[key];
        });

        const existingAsset = await Asset.findOne({ assetCode: assetData.assetCode });

        // If asset exists, don't overwrite its current status and isActive fields
        const updatePayload = { ...assetData };
        if (existingAsset) {
          delete updatePayload.status;
          delete updatePayload.isActive;
        }

        await Asset.findOneAndUpdate(
          { assetCode: assetData.assetCode },
          { ...updatePayload, updatedAt: new Date() },
          { upsert: true, new: true, runValidators: true }
        );

        if (existingAsset) result.updated++;
        else result.created++;
      } catch (err) {
        result.failed++;
        const rawCode = row['AssetCode'] || row['assetCode'] || 'Unknown';
        result.errors.push(`Row ${index + 2} (${rawCode}): ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `Processed ${result.total} records.`,
      data: result
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) try { fs.unlinkSync(req.file.path); } catch (e) { }
    next(error);
  }
};

// @desc    Export assets
export const exportAssets = async (req, res, next) => {
  try {
    const { query, empty, error } = buildAssetQuery(req);
    if (error) return res.status(403).json({ success: false, message: error });
    if (empty) return res.status(400).json({ success: false, message: 'No assets found' });

    const assets = await Asset.find(query).populate('siteId', 'siteName siteUniqueID').lean();

    const exportData = assets.map(asset => ({
      'Asset Code': asset.assetCode || '',
      'Asset Type': asset.assetType || '',
      'Device Type': asset.deviceType || '',
      'Make': asset.make || '',
      'Model': asset.model || '',
      'Serial Number': asset.serialNumber || '',
      'IP Address': asset.ipAddress || '',
      'MAC': asset.mac || '',
      'Site ID': asset.siteId?.siteUniqueID || '',
      'Site Name': asset.siteId?.siteName || '',
      'Location Name': asset.locationName || '',
      'Location Description': asset.locationDescription || '',
      'Used For': asset.usedFor || '',
      'Criticality': asset.criticality || 2,
      'Status': asset.status || '',
      'VMS Ref ID': asset.vmsReferenceId || '',
      'NMS Ref ID': asset.nmsReferenceId || '',
      'Username': asset.userName || '',
      'Password': asset.password || '',
      'Installation Date': asset.installationDate ? new Date(asset.installationDate).toLocaleDateString() : '',
      'Warranty End Date': asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString() : '',
      'Remark': asset.remark || '',
      'Is Active': asset.isActive ? 'Yes' : 'No'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="assets_export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// @desc    Download template
export const downloadTemplate = async (req, res, next) => {
  try {
    const templateData = [{
      'AssetCode': 'CAM-001',
      'AssetType': 'Camera',
      'DeviceType': 'Fixed Dome',
      'SiteId': 'SITE-001',
      'Make': 'Hikvision',
      'Model': 'DS-2CD2385G1-I',
      'SerialNumber': 'ABC123456789',
      'IPAddress': '192.168.1.10',
      'MAC': 'AA:BB:CC:DD:EE:FF',
      'LocationName': 'Entrance A',
      'LocationDescription': 'Main gate entrance',
      'UsedFor': 'General Surveillance',
      'Criticality': '1 (Low), 2 (Medium), 3 (High)',
      'Status': 'Operational/Degraded/Offline/Maintenance/Not Installed',
      'VMSReferenceId': '',
      'NMSReferenceId': '',
      'UserName': 'admin',
      'Password': 'password123',
      'InstallationDate': 'YYYY-MM-DD',
      'WarrantyEndDate': 'YYYY-MM-DD',
      'Remark': '',
      'IsActive': 'Yes/No'
    }];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="asset_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
