import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
      const dbPath = join(__dirname, '..', 'config', 'database.js');
      const { default: connectDB } = await import(dbPath);
      await connectDB();
      dbInitialized = true;
      console.log('✅ Database initialized');
    } catch (err) {
      console.error('❌ DB init failed:', err.message);
    }
  }
};

// Initialize DB
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
    dbInitialized,
    dirname: __dirname
  });
});

// Cache for loaded routes
const routeCache = {};

// Helper to load routes with absolute paths
const loadRoute = async (routeName, routeFile) => {
  if (!routeCache[routeName]) {
    try {
      const routePath = join(__dirname, '..', 'routes', routeFile);
      console.log(`Loading ${routeName} from:`, routePath);
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
    const router = await loadRoute('auth', 'auth.routes.js');
    router(req, res, next);
  } catch (err) {
    res.status(500).json({ success: false, message: `Auth route error: ${err.message}` });
  }
});

// Sites routes
app.use('/api/sites', async (req, res, next) => {
  try {
    const router = await loadRoute('sites', 'site.routes.js');
    router(req, res, next);
  } catch (err) {
    res.status(500).json({ success: false, message: `Sites route error: ${err.message}` });
  }
});

// Assets routes
app.use('/api/assets', async (req, res, next) => {
  try {
    const router = await loadRoute('assets', 'asset.routes.js');
    router(req, res, next);
  } catch (err) {
    res.status(500).json({ success: false, message: `Assets route error: ${err.message}` });
  }
});

// Tickets routes
app.use('/api/tickets', async (req, res, next) => {
  try {
    const router = await loadRoute('tickets', 'ticket.routes.js');
    router(req, res, next);
  } catch (err) {
    res.status(500).json({ success: false, message: `Tickets route error: ${err.message}` });
  }
});

// Users routes
app.use('/api/users', async (req, res, next) => {
  try {
    const router = await loadRoute('users', 'user.routes.js');
    router(req, res, next);
  } catch (err) {
    res.status(500).json({ success: false, message: `Users route error: ${err.message}` });
  }
});

// Lookups routes
app.use('/api/lookups', async (req, res, next) => {
  try {
    const router = await loadRoute('lookups', 'lookup.routes.js');
    router(req, res, next);
  } catch (err) {
    res.status(500).json({ success: false, message: `Lookups route error: ${err.message}` });
  }
});

// Activities routes
app.use('/api/activities', async (req, res, next) => {
  try {
    const router = await loadRoute('activities', 'activity.routes.js');
    router(req, res, next);
  } catch (err) {
    res.status(500).json({ success: false, message: `Activities route error: ${err.message}` });
  }
});

// Settings routes
app.use('/api/settings', async (req, res, next) => {
  try {
    const router = await loadRoute('settings', 'settings.routes.js');
    router(req, res, next);
  } catch (err) {
    res.status(500).json({ success: false, message: `Settings route error: ${err.message}` });
  }
});

// User rights routes
app.use('/api/user-rights', async (req, res, next) => {
  try {
    const router = await loadRoute('userRights', 'userRight.routes.js');
    router(req, res, next);
  } catch (err) {
    res.status(500).json({ success: false, message: `User rights route error: ${err.message}` });
  }
});

// Notifications routes
app.use('/api/notifications', async (req, res, next) => {
  try {
    const router = await loadRoute('notifications', 'notification.routes.js');
    router(req, res, next);
  } catch (err) {
    res.status(500).json({ success: false, message: `Notifications route error: ${err.message}` });
  }
});

// Static files
app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    loadedRoutes: Object.keys(routeCache)
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
