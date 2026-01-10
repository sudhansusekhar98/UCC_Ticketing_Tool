import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB once
let dbInitialized = false;
const initDB = async () => {
  if (!dbInitialized) {
    try {
      const { default: connectDB } = await import('../config/database.js');
      await connectDB();
      dbInitialized = true;
      console.log('✅ Database initialized');
    } catch (err) {
      console.error('❌ DB init failed:', err);
    }
  }
};

// Initialize DB on first import
initDB();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'UCC Ticketing API',
    status: 'running',
    version: '1.0.0'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    mongodb: process.env.MONGODB_URI ? 'configured' : 'not configured',
    dbInitialized
  });
});

// Cache for loaded routes
const routeCache = {};

// Helper to load and cache routes
const loadRoute = async (routeName, routePath) => {
  if (!routeCache[routeName]) {
    try {
      const module = await import(routePath);
      routeCache[routeName] = module.default;
      console.log(`✅ Loaded route: ${routeName}`);
    } catch (err) {
      console.error(`❌ Failed to load ${routeName}:`, err.message);
      throw err;
    }
  }
  return routeCache[routeName];
};

// Auth routes
app.use('/api/auth', async (req, res, next) => {
  try {
    const router = await loadRoute('auth', '../routes/auth.routes.js');
    router(req, res, next);
  } catch (err) {
    res.status(500).json({ success: false, message: `Auth route error: ${err.message}` });
  }
});

// Sites routes
app.use('/api/sites', async (req, res, next) => {
  try {
    const router = await loadRoute('sites', '../routes/site.routes.js');
    router(req, res, next);
  } catch (err) {
    res.status(500).json({ success: false, message: `Sites route error: ${err.message}` });
  }
});

// Assets routes
app.use('/api/assets', async (req, res, next) => {
  try {
    const router = await loadRoute('assets', '../routes/asset.routes.js');
    router(req, res, next);
  } catch (err) {
    res.status(500).json({ success: false, message: `Assets route error: ${err.message}` });
  }
});

// Tickets routes
app.use('/api/tickets', async (req, res, next) => {
  try {
    const router = await loadRoute('tickets', '../routes/ticket.routes.js');
    router(req, res, next);
  } catch (err) {
    res.status(500).json({ success: false, message: `Tickets route error: ${err.message}` });
  }
});

// Users routes
app.use('/api/users', async (req, res, next) => {
  try {
    const router = await loadRoute('users', '../routes/user.routes.js');
    router(req, res, next);
  } catch (err) {
    res.status(500).json({ success: false, message: `Users route error: ${err.message}` });
  }
});

// Lookups routes
app.use('/api/lookups', async (req, res, next) => {
  try {
    const router = await loadRoute('lookups', '../routes/lookup.routes.js');
    router(req, res, next);
  } catch (err) {
    res.status(500).json({ success: false, message: `Lookups route error: ${err.message}` });
  }
});

// Activities routes
app.use('/api/activities', async (req, res, next) => {
  try {
    const router = await loadRoute('activities', '../routes/activity.routes.js');
    router(req, res, next);
  } catch (err) {
    res.status(500).json({ success: false, message: `Activities route error: ${err.message}` });
  }
});

// Settings routes
app.use('/api/settings', async (req, res, next) => {
  try {
    const router = await loadRoute('settings', '../routes/settings.routes.js');
    router(req, res, next);
  } catch (err) {
    res.status(500).json({ success: false, message: `Settings route error: ${err.message}` });
  }
});

// User rights routes
app.use('/api/user-rights', async (req, res, next) => {
  try {
    const router = await loadRoute('userRights', '../routes/userRight.routes.js');
    router(req, res, next);
  } catch (err) {
    res.status(500).json({ success: false, message: `User rights route error: ${err.message}` });
  }
});

// Notifications routes
app.use('/api/notifications', async (req, res, next) => {
  try {
    const router = await loadRoute('notifications', '../routes/notification.routes.js');
    router(req, res, next);
  } catch (err) {
    res.status(500).json({ success: false, message: `Notifications route error: ${err.message}` });
  }
});

// Static files
app.use('/uploads', express.static('uploads'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    availableRoutes: Object.keys(routeCache)
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default app;
