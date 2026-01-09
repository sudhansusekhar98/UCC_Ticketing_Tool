import Asset from '../models/Asset.model.js';
import Site from '../models/Site.model.js';
import XLSX from 'xlsx';
import fs from 'fs';

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
    const user = req.user;
    
    // Restrict non-admins to their own site
    if (user.role !== 'Admin') {
      if (!user.siteId) {
        // If user has no site but is not admin, they see nothing (or handle appropriate error)
        // Returning empty result for safety
        return res.json({
          success: true,
          data: [],
          pagination: { page: 1, limit: parseInt(limit), total: 0, pages: 0 }
        });
      }
      query.siteId = user.siteId;
    }
    
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
     // Admin only deletion usually, but if other roles allowed, restrict to site
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
    const query = { isActive: true };
    
    if (req.user.role !== 'Admin') {
      query.siteId = req.user.siteId;
    } else if (siteId) {
      query.siteId = siteId;
    }
    
    // Filter by assetType if provided
    if (assetType) {
      query.assetType = assetType;
    }
    
    const assets = await Asset.find(query)
      .select('assetCode assetType deviceType locationDescription siteId')
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
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel or CSV file' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Use raw: false to get formatted values, defval to preserve empty cells
    const data = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });
    
    // Clean up uploaded file
    try {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch (e) { console.error('Error deleting file:', e); }

    const result = {
      total: data.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    // Helper to normalize keys (lowercase, remove special chars)
    const normalizeKey = key => key ? key.toString().toLowerCase().replace(/[^a-z0-9]/g, '') : '';

    // Helper to safely convert to string (handles any type)
    const toString = (val) => {
      if (val === null || val === undefined || val === '') return undefined;
      return String(val).trim();
    };

    // Helper to safely parse integers
    const toInt = (val, defaultVal = undefined) => {
      if (val === null || val === undefined || val === '') return defaultVal;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? defaultVal : parsed;
    };

    // Helper to safely parse dates
    const toDate = (val) => {
      if (val === null || val === undefined || val === '') return undefined;
      // Handle Excel serial dates
      if (typeof val === 'number') {
        const date = new Date((val - 25569) * 86400 * 1000);
        return isNaN(date.getTime()) ? undefined : date;
      }
      const date = new Date(val);
      return isNaN(date.getTime()) ? undefined : date;
    };

    // Helper to parse boolean
    const toBool = (val, defaultVal = true) => {
      if (val === null || val === undefined || val === '') return defaultVal;
      const str = String(val).toLowerCase().trim();
      if (['true', '1', 'yes', 'y', 'active'].includes(str)) return true;
      if (['false', '0', 'no', 'n', 'inactive'].includes(str)) return false;
      return defaultVal;
    };

    // Valid status values
    const validStatuses = ['Operational', 'Degraded', 'Offline', 'Maintenance'];

    for (const [index, row] of data.entries()) {
      try {
        // Create a normalized map of the row - preserve all values
        const normalizedRow = {};
        Object.keys(row).forEach(key => {
          normalizedRow[normalizeKey(key)] = row[key];
        });

        // Resolve Site by SiteUniqueID
        // Matches: SiteId, siteId, SiteUniqueID, Site Unique ID, etc.
        const siteUniqueId = toString(normalizedRow['siteid']) || toString(normalizedRow['siteuniqueid']);

        if (!siteUniqueId) {
          throw new Error('SiteId (Site Unique ID) is missing');
        }

        const site = await Site.findOne({ siteUniqueID: siteUniqueId });
        if (!site) {
          throw new Error(`Site with Unique ID '${siteUniqueId}' not found`);
        }

        // Map row to Asset fields with flexible matching
        const assetCode = toString(normalizedRow['assetcode']);
        const assetType = toString(normalizedRow['assettype']) || toString(normalizedRow['devicetype']);
        
        // Parse criticality - must be 1, 2, or 3
        let criticality = toInt(normalizedRow['criticality'], 2);
        if (![1, 2, 3].includes(criticality)) criticality = 2; // Default to Medium

        // Parse status - must be valid enum value
        let status = toString(normalizedRow['status']) || 'Operational';
        // Try to match status case-insensitively
        const matchedStatus = validStatuses.find(s => s.toLowerCase() === status.toLowerCase());
        status = matchedStatus || 'Operational';

        // Build asset data with ALL possible fields from the model
        const assetData = {
          // Required fields
          assetCode: assetCode,
          assetType: assetType,
          siteId: site._id,
          
          // Optional string fields - accept any value
          serialNumber: toString(normalizedRow['serialnumber']) || toString(normalizedRow['serialno']),
          mac: toString(normalizedRow['mac']) || toString(normalizedRow['macaddress']),
          ipAddress: toString(normalizedRow['ipaddress']) || toString(normalizedRow['ip']) || toString(normalizedRow['managementip']) || toString(normalizedRow['mgmtip']),
          locationDescription: toString(normalizedRow['location']) || toString(normalizedRow['locationdescription']),
          locationName: toString(normalizedRow['locationname']),
          make: toString(normalizedRow['make']) || toString(normalizedRow['makebrand']) || toString(normalizedRow['brand']),
          model: toString(normalizedRow['model']) || toString(normalizedRow['modelname']),
          deviceType: toString(normalizedRow['devicetype']),
          usedFor: toString(normalizedRow['usedfor']) || toString(normalizedRow['purpose']) || toString(normalizedRow['usage']),
          userName: toString(normalizedRow['username']) || toString(normalizedRow['user']),
          password: toString(normalizedRow['password']) || toString(normalizedRow['pwd']),
          remark: toString(normalizedRow['remark']) || toString(normalizedRow['remarks']) || toString(normalizedRow['notes']) || toString(normalizedRow['comment']),
          vmsReferenceId: toString(normalizedRow['vmsreferenceid']) || toString(normalizedRow['vmsid']) || toString(normalizedRow['vmsref']),
          nmsReferenceId: toString(normalizedRow['nmsreferenceid']) || toString(normalizedRow['nmsid']) || toString(normalizedRow['nmsref']),
          
          // Enum/validated fields
          criticality: criticality,
          status: status,
          
          // Date fields
          installationDate: toDate(normalizedRow['installationdate']) || toDate(normalizedRow['installeddate']) || toDate(normalizedRow['installedon']),
          warrantyEndDate: toDate(normalizedRow['warrantyenddate']) || toDate(normalizedRow['warrantyend']) || toDate(normalizedRow['warrantyexpiry']),
          
          // Boolean field
          isActive: toBool(normalizedRow['isactive'], true)
        };

        // Remove undefined values to avoid overwriting existing data with undefined
        Object.keys(assetData).forEach(key => {
          if (assetData[key] === undefined) {
            delete assetData[key];
          }
        });

        if (!assetData.assetCode) throw new Error('Asset Code is missing');
        if (!assetData.assetType) throw new Error('Asset Type is missing');

        // Check if asset already exists
        const existingAsset = await Asset.findOne({ assetCode: assetData.assetCode });
        
        // Upsert asset by assetCode - preserves the original _id for existing assets
        await Asset.findOneAndUpdate(
          { assetCode: assetData.assetCode },
          { ...assetData, updatedAt: new Date() },
          { upsert: true, new: true, runValidators: true }
        );

        if (existingAsset) {
          result.updated++;
        } else {
          result.created++;
        }
      } catch (err) {
        result.failed++;
        // Try to get asset code from row even if normalization failed or wasn't used yet
        const rawAssetCode = row['AssetCode'] || row['assetCode'] || row['Asset Code'] || 'Unknown';
        result.errors.push(`Row ${index + 2} (${rawAssetCode}): ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `Processed ${result.total} records. Created: ${result.created}, Updated: ${result.updated}, Failed: ${result.failed}`,
      data: result
    });

  } catch (error) {
     // Clean up on error if not done
     if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch(e) {}
     }
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
    
    // Transform data for Excel - matching SQL table schema
    const exportData = assets.map(asset => ({
      'Asset Code': asset.assetCode || '',
      'Asset Type': asset.assetType || '',
      'Serial Number': asset.serialNumber || '',
      'IP Address': asset.ipAddress || '',
      'MAC': asset.mac || '',
      'Site ID': asset.siteId?.siteUniqueID || '',
      'Site Name': asset.siteId?.siteName || '',
      'Location Description': asset.locationDescription || '',
      'Location Name': asset.locationName || '',
      'Criticality': asset.criticality || 2,
      'Status': asset.status || 'Operational',
      'Installation Date': asset.installationDate ? new Date(asset.installationDate).toISOString().split('T')[0] : '',
      'Warranty End Date': asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toISOString().split('T')[0] : '',
      'VMS Reference Id': asset.vmsReferenceId || '',
      'NMS Reference Id': asset.nmsReferenceId || '',
      'Make': asset.make || '',
      'Model': asset.model || '',
      'Device Type': asset.deviceType || '',
      'Used For': asset.usedFor || '',
      'User Name': asset.userName || '',
      'Remark': asset.remark || '',
      'Is Active': asset.isActive ? 'Yes' : 'No'
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    res.setHeader('Content-Disposition', 'attachment; filename="assets_export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// @desc    Download template
// @route   GET /api/assets/template
// @access  Private
export const downloadTemplate = async (req, res, next) => {
  try {
    // Template data with headers and example rows - matching the exact column order
    const templateData = [
      {
        'AssetCode': 'CAM-001',
        'AssetType': 'Camera',
        'SiteId': 'RNSPL-HTV',
        'Make': '',
        'Model': '',
        'SerialNumber': '',
        'ManagementIP': '10.0.48.10',
        'MAC': '00:02:01:50:81:29',
        'LocationName': 'Lalkotara Chowk',
        'LocationDescription': 'lalkotara Chowk, lalkotara Chowk, Camera Security Monitoring.',
        'DeviceType': '',
        'UsedFor': '',
        'UserName': '',
        'Password': '',
        'Remark': '',
        'Criticality': '1=Low/ 2=Medium/ 3=High',
        'Status': 'Operational/Degraded/Offline/Maintenance',
        'IsActive': '',
        'InstallationDate': 'YYYY-MM-DD',
        'WarrantyEndDate': 'YYYY-MM-DD'
      },
      {
        'AssetCode': 'CAM-002',
        'AssetType': 'Camera',
        'SiteId': 'RNSPL-HTV',
        'Make': '',
        'Model': '',
        'SerialNumber': '',
        'ManagementIP': '10.0.48.11',
        'MAC': '00:02:01:50:81:2a',
        'LocationName': 'Lalkotara Chowk',
        'LocationDescription': 'lalkotara Chowk, lalkotara Chowk, Camera Security Monitoring.',
        'DeviceType': '',
        'UsedFor': '',
        'UserName': '',
        'Password': '',
        'Remark': '',
        'Criticality': '',
        'Status': '',
        'IsActive': '',
        'InstallationDate': '',
        'WarrantyEndDate': ''
      },
      {
        'AssetCode': 'CAM-003',
        'AssetType': 'Camera',
        'SiteId': 'RNSPL-HTV',
        'Make': '',
        'Model': '',
        'SerialNumber': '',
        'ManagementIP': '10.0.48.12',
        'MAC': '00:02:01:50:81:2b',
        'LocationName': 'Lalkotara Chowk',
        'LocationDescription': 'lalkotara Chowk, lalkotara Chowk, Camera Security Monitoring.',
        'DeviceType': '',
        'UsedFor': '',
        'UserName': '',
        'Password': '',
        'Remark': '',
        'Criticality': '',
        'Status': '',
        'IsActive': '',
        'InstallationDate': '',
        'WarrantyEndDate': ''
      },
      {
        'AssetCode': 'CAM-1825',
        'AssetType': 'Camera',
        'SiteId': 'NDPL',
        'Make': '',
        'Model': '',
        'SerialNumber': '',
        'ManagementIP': '10.0.68.23',
        'MAC': 'e0:46:ee:57:11:f4',
        'LocationName': 'Badagaon university crossing',
        'LocationDescription': 'gate-Badagaon - Badagaon university crossing',
        'DeviceType': '',
        'UsedFor': '',
        'UserName': '',
        'Password': '',
        'Remark': '',
        'Criticality': '',
        'Status': '',
        'IsActive': '',
        'InstallationDate': '',
        'WarrantyEndDate': ''
      }
    ];

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets Template');

    // Set column widths for all columns (matching the column order)
    worksheet['!cols'] = [
      { wch: 15 }, // AssetCode
      { wch: 12 }, // AssetType
      { wch: 15 }, // SiteId
      { wch: 12 }, // Make
      { wch: 15 }, // Model
      { wch: 15 }, // SerialNumber
      { wch: 15 }, // ManagementIP
      { wch: 20 }, // MAC
      { wch: 25 }, // LocationName
      { wch: 40 }, // LocationDescription
      { wch: 15 }, // DeviceType
      { wch: 20 }, // UsedFor
      { wch: 12 }, // UserName
      { wch: 15 }, // Password
      { wch: 30 }, // Remark
      { wch: 25 }, // Criticality
      { wch: 35 }, // Status
      { wch: 10 }, // IsActive
      { wch: 18 }, // InstallationDate
      { wch: 18 }  // WarrantyEndDate
    ];

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    res.setHeader('Content-Disposition', 'attachment; filename="assets_import_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
