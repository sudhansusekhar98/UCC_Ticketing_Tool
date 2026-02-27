import Asset from '../models/Asset.model.js';
import Site from '../models/Site.model.js';
import mongoose from 'mongoose';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import net from 'net';
import { decrypt, isEncrypted, SENSITIVE_ASSET_FIELDS } from '../utils/encryption.utils.js';
import { createAuditLog } from '../middleware/audit.middleware.js';
import DailyWorkLog from '../models/DailyWorkLog.model.js';

const execAsync = promisify(exec);

// In-memory store for ping progress (keyed by userId)
// This allows HTTP polling as a fallback when WebSockets aren't available
const pingProgressStore = new Map();

/**
 * Cross-platform ping check.
 * - Windows:    native ping.exe -n 1 -w <ms>
 * - Linux/Mac:  native ping -c 1 -W <sec>  (ICMP)
 * - Serverless: TCP connect probe on common ports (last resort)
 */
async function crossPlatformPing(ipAddress, timeoutMs = 3000) {
  // Windows: native ping.exe
  if (process.platform === 'win32') {
    try {
      const command = `ping -n 1 -w ${timeoutMs} ${ipAddress}`;
      const { stdout } = await execAsync(command, { timeout: timeoutMs + 3000 });
      return /TTL=/i.test(stdout);
    } catch {
      return false;
    }
  }

  // Linux / macOS: native ping command (ICMP)
  try {
    const timeoutSec = Math.max(1, Math.ceil(timeoutMs / 1000));
    // -c 1 = one packet, -W = timeout in seconds (Linux), -t = timeout (macOS)
    const flag = process.platform === 'darwin' ? '-t' : '-W';
    const command = `ping -c 1 ${flag} ${timeoutSec} ${ipAddress}`;
    const { stdout } = await execAsync(command, { timeout: timeoutMs + 3000 });
    // Linux/Mac ping output contains "ttl=" on success
    return /ttl=/i.test(stdout);
  } catch {
    // ping command failed or not available — fall through to TCP probe
  }

  // Last resort: TCP connect probe on common ports
  // (for serverless environments where ICMP is blocked)
  const ports = [80, 443, 554, 8080];
  for (const port of ports) {
    try {
      const result = await new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(timeoutMs);
        socket.once('connect', () => { socket.destroy(); resolve(true); });
        socket.once('timeout', () => { socket.destroy(); resolve(false); });
        socket.once('error', () => { socket.destroy(); resolve(false); });
        socket.connect(port, ipAddress);
      });
      if (result) return true;
    } catch {
      // try next port
    }
  }
  return false;
}

// Roles used for audit logging on credential-specific endpoints
const PRIVILEGED_ROLES = ['Admin', 'Supervisor'];

/**
 * Process asset for API response — always decrypt sensitive fields.
 * Data remains encrypted at rest in MongoDB; decrypted only for display.
 */
const processAssetForResponse = (asset) => {
  if (!asset) return asset;

  const obj = typeof asset.toObject === 'function' ? asset.toObject() : { ...asset };
  return Asset.decryptSensitiveFields(obj);
};

const processAssetsForResponse = (assets) => {
  return assets.map(a => processAssetForResponse(a));
};

// Helper to build asset query based on filters and user permissions
const buildAssetQuery = (req) => {
  const {
    siteId, assetType, deviceType, status, criticality, isActive, locationName,
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
  if (deviceType) query.deviceType = deviceType;

  // By default, exclude Spare assets from general asset lists
  if (status) {
    query.status = status;
  } else {
    query.status = { $ne: 'Spare' };
  }

  if (criticality) query.criticality = parseInt(criticality);
  if (isActive !== undefined) query.isActive = isActive === 'true';

  if (search) {
    // Only search on non-sensitive fields to avoid matching against encrypted ciphertext
    query.$or = [
      { assetCode: { $regex: search, $options: 'i' } },
      { locationDescription: { $regex: search, $options: 'i' } },
      { locationName: { $regex: search, $options: 'i' } },
      { make: { $regex: search, $options: 'i' } },
      { model: { $regex: search, $options: 'i' } },
      { assetType: { $regex: search, $options: 'i' } },
      { deviceType: { $regex: search, $options: 'i' } }
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

    // Build a separate query for status counts that ignores the status filter
    // but respects all other filters (site, location, asset type, etc.)
    const countQuery = { ...query };
    // Remove the status filter so we can count all statuses
    delete countQuery.status;
    // Always exclude 'Spare' from operational counts
    countQuery.status = { $nin: ['Spare', 'Not Installed', 'InTransit', 'Damaged', 'Reserved', 'In Repair'] };

    // IMPORTANT: MongoDB Aggregation does NOT auto-convert strings to ObjectIds.
    // We must manually convert siteId if it exists in countQuery.
    if (countQuery.siteId) {
      if (typeof countQuery.siteId === 'string' && mongoose.Types.ObjectId.isValid(countQuery.siteId)) {
        countQuery.siteId = new mongoose.Types.ObjectId(countQuery.siteId);
      } else if (countQuery.siteId.$in && Array.isArray(countQuery.siteId.$in)) {
        countQuery.siteId.$in = countQuery.siteId.$in.map(id =>
          (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) ? new mongoose.Types.ObjectId(id) : id
        );
      }
    }

    const [assets, total, counts] = await Promise.all([
      Asset.find(query)
        .populate('siteId', 'siteName siteUniqueID')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Asset.countDocuments(query),
      Asset.aggregate([
        { $match: countQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    // Format counts - map database status values to our three categories
    const statusCounts = { online: 0, offline: 0, passive: 0 };
    counts.forEach(c => {
      const status = (c._id || '').toLowerCase();
      // Online category: Online, Operational
      if (status === 'online' || status === 'operational') {
        statusCounts.online += c.count;
      }
      // Offline category: Offline, Down, Degraded
      else if (status === 'offline' || status === 'down' || status === 'degraded') {
        statusCounts.offline += c.count;
      }
      // Passive category: Passive Device, Maintenance
      else if (status === 'passive device' || status === 'passive' || status === 'maintenance') {
        statusCounts.passive += c.count;
      }
    });

    res.json({
      success: true,
      data: processAssetsForResponse(assets),
      statusCounts,
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
      data: processAssetForResponse(asset)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get decrypted credentials for a specific asset (Admin/Supervisor only)
// @route   GET /api/assets/:id/credentials
// @access  Private (Admin, Supervisor)
export const getAssetCredentials = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id)
      .select('assetCode ipAddress mac serialNumber userName password siteId');

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    // Decrypt sensitive fields
    const decryptedAsset = Asset.decryptSensitiveFields(asset);

    // Audit log this access
    await createAuditLog({
      user: req.user,
      action: 'VIEW_CREDENTIALS',
      resourceType: 'Asset',
      resourceId: asset._id,
      details: `Viewed credentials for asset ${asset.assetCode}`,
      fieldsAccessed: ['ipAddress', 'mac', 'serialNumber', 'userName', 'password'],
      req,
      success: true
    });

    res.json({
      success: true,
      data: {
        _id: decryptedAsset._id,
        assetCode: decryptedAsset.assetCode,
        ipAddress: decryptedAsset.ipAddress,
        mac: decryptedAsset.mac,
        serialNumber: decryptedAsset.serialNumber,
        userName: decryptedAsset.userName,
        password: decryptedAsset.password
      }
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

    // Fire-and-forget: auto-track
    DailyWorkLog.logActivity(req.user._id, {
      category: 'AssetCreated',
      description: `Created asset ${asset.assetCode || asset._id}`,
      refModel: 'Asset',
      refId: asset._id,
      metadata: { assetCode: asset.assetCode }
    }).catch(() => { });
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

    // Fire-and-forget: auto-track
    DailyWorkLog.logActivity(req.user._id, {
      category: 'AssetUpdated',
      description: `Updated asset ${asset.assetCode || asset._id}`,
      refModel: 'Asset',
      refId: asset._id,
      metadata: { assetCode: asset.assetCode }
    }).catch(() => { });
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

    // Fire-and-forget: auto-track
    DailyWorkLog.logActivity(req.user._id, {
      category: 'AssetDeleted',
      description: `Deleted asset ${asset.assetCode || asset._id}`,
      refModel: 'Asset',
      refId: asset._id,
      metadata: { assetCode: asset.assetCode }
    }).catch(() => { });
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

    try {
      if (isMemoryStorage) {
        workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      } else {
        const absolutePath = path.resolve(req.file.path);
        if (!fs.existsSync(absolutePath)) {
          throw new Error(`Upload failed: File not found at ${absolutePath}`);
        }
        const fileBuffer = fs.readFileSync(absolutePath);
        workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      }
    } catch (readError) {
      console.error('Asset Import Read Error:', readError);
      return res.status(400).json({
        success: false,
        message: 'Failed to read the uploaded file. Ensure it is a valid Excel or CSV file.',
        error: readError.message
      });
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

        // Always apply the full payload including status and isActive.
        // The Excel file is the source of truth for bulk updates.
        await Asset.findOneAndUpdate(
          { assetCode: assetData.assetCode },
          { ...assetData, updatedAt: new Date() },
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

    // Fire-and-forget: auto-track bulk import
    DailyWorkLog.logActivity(req.user._id, {
      category: 'AssetImported',
      description: `Bulk imported ${result.total} assets (${result.created} created, ${result.updated} updated, ${result.failed} failed)`,
      metadata: { total: result.total, created: result.created, updated: result.updated, failed: result.failed }
    }).catch(() => { });
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

    // Audit log export of sensitive data
    await createAuditLog({
      user: req.user,
      action: 'EXPORT_SENSITIVE',
      resourceType: 'Asset',
      details: `Exported ${assets.length} assets with sensitive data`,
      fieldsAccessed: SENSITIVE_ASSET_FIELDS,
      req,
      success: true
    });

    const exportData = assets.map(asset => {
      // Always decrypt for export display
      const processedAsset = Asset.decryptSensitiveFields(asset);

      return {
        'Asset Code': processedAsset.assetCode || '',
        'Asset Type': processedAsset.assetType || '',
        'Device Type': processedAsset.deviceType || '',
        'Make': processedAsset.make || '',
        'Model': processedAsset.model || '',
        'Serial Number': processedAsset.serialNumber || '',
        'IP Address': processedAsset.ipAddress || '',
        'MAC': processedAsset.mac || '',
        'Site ID': asset.siteId?.siteUniqueID || '',
        'Site Name': asset.siteId?.siteName || '',
        'Location Name': processedAsset.locationName || '',
        'Location Description': processedAsset.locationDescription || '',
        'Used For': processedAsset.usedFor || '',
        'Criticality': processedAsset.criticality || 2,
        'Status': processedAsset.status || '',
        'VMS Ref ID': processedAsset.vmsReferenceId || '',
        'NMS Ref ID': processedAsset.nmsReferenceId || '',
        'Username': processedAsset.userName || '',
        'Password': processedAsset.password || '',
        'Installation Date': asset.installationDate ? new Date(asset.installationDate).toLocaleDateString() : '',
        'Warranty End Date': asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString() : '',
        'Remark': processedAsset.remark || '',
        'Is Active': asset.isActive ? 'Yes' : 'No'
      };
    });

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

// @desc    Get assets for client-side ping check (returns decrypted IPs)
// @route   POST /api/assets/check-status
// @access  Private (Admin, Supervisor)
export const checkAssetsStatus = async (req, res, next) => {
  try {
    const { query, empty, error } = buildAssetQuery(req);
    if (error) return res.status(403).json({ success: false, message: error });

    if (empty) {
      return res.json({
        success: true,
        message: 'No assets found with selected filters.',
        data: []
      });
    }

    const assets = await Asset.find(query).select('assetCode ipAddress status');

    if (assets.length === 0) {
      return res.json({
        success: true,
        message: 'No assets found matching filters.',
        data: []
      });
    }

    // Decrypt IPs and return asset list for client-side pinging
    const assetList = assets.map(a => {
      const rawIp = a.ipAddress ? (isEncrypted(a.ipAddress) ? decrypt(a.ipAddress) : a.ipAddress) : '';
      const ip = rawIp.trim();
      return {
        _id: a._id,
        assetCode: a.assetCode,
        ipAddress: (!ip || ip.toUpperCase() === 'NA') ? '' : ip,
      };
    });

    console.log(`[Ping] Returning ${assetList.length} assets for client-side ping check (user: ${req.user._id})`);

    res.json({
      success: true,
      message: `Found ${assetList.length} assets for ping check.`,
      data: assetList
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get ping progress for HTTP polling (fallback when WebSockets unavailable)
// @route   GET /api/assets/ping-progress
// @access  Private (Admin, Supervisor)
export const getPingProgress = async (req, res) => {
  const userId = req.user._id.toString();
  const progress = pingProgressStore.get(userId);

  if (!progress) {
    return res.json({
      success: true,
      data: { status: 'idle', stats: null, log: [] }
    });
  }

  // Only send new log entries since the client's last poll
  const since = parseInt(req.query.since) || 0;
  const newEntries = since > 0
    ? progress.log.filter((_, idx) => idx < progress.log.length) // all entries (log is already capped at 50)
    : progress.log;

  res.json({
    success: true,
    data: {
      status: progress.status,
      stats: progress.stats,
      log: newEntries,
      lastUpdated: progress.lastUpdated
    }
  });
};

// @desc    Clear ping progress after client acknowledges completion
// @route   DELETE /api/assets/ping-progress
// @access  Private
export const clearPingProgress = async (req, res) => {
  const userId = req.user._id.toString();
  pingProgressStore.delete(userId);
  res.json({ success: true });
};

// @desc    Bulk update asset statuses from client-side ping script
// @route   POST /api/assets/bulk-status-update
// @access  Private (Admin, Supervisor)
export const updateBulkStatus = async (req, res, next) => {
  try {
    const { results } = req.body; // Array of { id, status }

    if (!results || !Array.isArray(results)) {
      return res.status(400).json({ success: false, message: 'Invalid results format' });
    }

    const stats = { total: results.length, online: 0, offline: 0, passive: 0, processed: 0 };

    // Batch update — trust the status from the client's local ping script
    for (const item of results) {
      if (!item.id || !item.status) continue;

      const validStatuses = ['Online', 'Offline', 'Passive Device'];
      const status = validStatuses.includes(item.status) ? item.status : 'Offline';

      try {
        await Asset.updateOne(
          { _id: item.id },
          { $set: { status, updatedAt: new Date() } }
        );

        if (status === 'Online') stats.online++;
        else if (status === 'Passive Device') stats.passive++;
        else stats.offline++;
        stats.processed++;
      } catch (err) {
        console.error(`[BulkUpdate] Failed to update asset ${item.id}:`, err.message);
      }
    }

    console.log(`[BulkUpdate] Updated ${stats.processed}/${stats.total} assets: ${stats.online} Online, ${stats.offline} Offline, ${stats.passive} Passive`);

    res.json({ success: true, message: 'Statuses updated successfully', data: stats });
  } catch (error) {
    next(error);
  }
};

// @desc    Export status report for filtered assets with IP
// @route   GET /api/assets/export-status
// @access  Private
// @desc    Get sites that have assets (for dynamic filtering)
// @route   GET /api/assets/sites-with-assets
// @access  Private
export const getSitesWithAssets = async (req, res, next) => {
  try {
    const query = { status: { $ne: 'Spare' } };

    // Non-admins can only see assets from their assigned sites
    if (req.user.role !== 'Admin') {
      if (!req.user.assignedSites || req.user.assignedSites.length === 0) {
        return res.json({ success: true, data: [] });
      }
      query.siteId = { $in: req.user.assignedSites };
    }

    // Aggregate to get unique sites that have assets with locations
    const sitesWithAssets = await Asset.aggregate([
      { $match: query },
      { $match: { locationName: { $exists: true, $ne: '', $ne: null } } },
      {
        $group: {
          _id: '$siteId'
        }
      },
      {
        $lookup: {
          from: 'sites',
          localField: '_id',
          foreignField: '_id',
          as: 'site'
        }
      },
      { $unwind: '$site' },
      {
        $project: {
          value: '$site._id',
          label: '$site.siteName'
        }
      },
      { $sort: { label: 1 } }
    ]);

    res.json({
      success: true,
      data: sitesWithAssets
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export status report for filtered assets with IP
// @route   GET /api/assets/export-status
// @access  Private
export const exportStatusReport = async (req, res, next) => {
  try {
    const { query, empty, error } = buildAssetQuery(req);
    if (error) return res.status(403).json({ success: false, message: error });
    if (empty) return res.status(400).json({ success: false, message: 'No assets found' });

    // Filter only those that have an IP address
    query.ipAddress = { $exists: true, $ne: '' };

    const assets = await Asset.find(query).populate('siteId', 'siteName siteUniqueID').sort({ assetCode: 1 });

    if (assets.length === 0) {
      return res.status(400).json({ success: false, message: 'No assets with IP addresses found for selected filters' });
    }

    const exportData = assets.map(asset => {
      // Always decrypt for display
      let displayIp = asset.ipAddress || '';
      if (isEncrypted(displayIp)) {
        displayIp = decrypt(displayIp);
      }

      return {
        'Asset Code': asset.assetCode || '',
        'Asset Type': asset.assetType || '',
        'Device Type': asset.deviceType || '',
        'IP Address': displayIp,
        'Current Status': asset.status || '',
        'Site Name': asset.siteId?.siteName || '',
        'Location': asset.locationName || '',
        'Last Checked': asset.updatedAt ? new Date(asset.updatedAt).toLocaleString() : 'Never'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Asset Status Report');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="asset_status_report.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
