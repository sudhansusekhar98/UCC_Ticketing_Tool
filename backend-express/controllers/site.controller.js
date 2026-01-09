import Site from '../models/Site.model.js';

// @desc    Get all sites
// @route   GET /api/sites
// @access  Private
export const getSites = async (req, res, next) => {
  try {
    const { city, zone, isActive, search, page = 1, limit = 50 } = req.query;
    
    const query = {};
    const user = req.user;

    // Restrict non-admins to their assigned sites
    if (user.role !== 'Admin') {
      if (!user.assignedSites || user.assignedSites.length === 0) {
        return res.json({
          success: true,
          data: [],
          pagination: { page: 1, limit: parseInt(limit), total: 0, pages: 0 }
        });
      }
      query._id = { $in: user.assignedSites };
    }
    
    if (city) query.city = city;
    if (zone) query.zone = zone;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { siteName: { $regex: search, $options: 'i' } },
        { siteUniqueID: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [sites, total] = await Promise.all([
      Site.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Site.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: sites,
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

// @desc    Get single site
// @route   GET /api/sites/:id
// @access  Private
export const getSiteById = async (req, res, next) => {
  try {
    const site = await Site.findById(req.params.id);
    
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }
    
    res.json({
      success: true,
      data: site
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create site
// @route   POST /api/sites
// @access  Private (Admin, Dispatcher)
export const createSite = async (req, res, next) => {
  try {
    const site = await Site.create(req.body);
    
    res.status(201).json({
      success: true,
      data: site,
      message: 'Site created successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Site with this unique ID already exists'
      });
    }
    next(error);
  }
};

// @desc    Update site
// @route   PUT /api/sites/:id
// @access  Private (Admin, Dispatcher)
export const updateSite = async (req, res, next) => {
  try {
    const site = await Site.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }
    
    res.json({
      success: true,
      data: site,
      message: 'Site updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete site
// @route   DELETE /api/sites/:id
// @access  Private (Admin)
export const deleteSite = async (req, res, next) => {
  try {
    const site = await Site.findByIdAndDelete(req.params.id);
    
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Site deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sites dropdown
// @route   GET /api/sites/dropdown
// @access  Private
export const getSitesDropdown = async (req, res, next) => {
  try {
    const query = { isActive: true };
    
    if (req.user.role !== 'Admin') {
      if (!req.user.assignedSites || req.user.assignedSites.length === 0) {
        return res.json({ success: true, data: [] });
      }
      query._id = { $in: req.user.assignedSites };
    }

    const sites = await Site.find(query)
      .select('siteName siteUniqueID')
      .sort({ siteName: 1 });
    
    res.json({
      success: true,
      data: sites
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unique cities
// @route   GET /api/sites/cities
// @access  Private
export const getCities = async (req, res, next) => {
  try {
    const cities = await Site.distinct('city', { isActive: true });
    
    res.json({
      success: true,
      data: cities.sort()
    });
  } catch (error) {
    next(error);
  }
};
