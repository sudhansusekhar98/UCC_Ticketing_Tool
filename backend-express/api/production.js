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

// Connect to MongoDB (lazy load to avoid blocking)
let dbConnected = false;
const ensureDB = async () => {
  if (!dbConnected) {
    try {
      const { default: connectDB } = await import('../config/database.js');
      await connectDB();
      dbConnected = true;
    } catch (err) {
      console.error('DB connection failed:', err);
    }
  }
};

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
    mongodb: process.env.MONGODB_URI ? 'configured' : 'not configured'
  });
});

// Auth routes - lazy load
app.use('/api/auth', async (req, res, next) => {
  try {
    await ensureDB();
    const { default: authRoutes } = await import('../routes/auth.routes.js');
    authRoutes(req, res, next);
  } catch (err) {
    console.error('Auth route error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Sites routes - lazy load
app.use('/api/sites', async (req, res, next) => {
  try {
    await ensureDB();
    const { default: siteRoutes } = await import('../routes/site.routes.js');
    siteRoutes(req, res, next);
  } catch (err) {
    console.error('Site route error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Assets routes - lazy load
app.use('/api/assets', async (req, res, next) => {
  try {
    await ensureDB();
    const { default: assetRoutes } = await import('../routes/asset.routes.js');
    assetRoutes(req, res, next);
  } catch (err) {
    console.error('Asset route error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Tickets routes - lazy load
app.use('/api/tickets', async (req, res, next) => {
  try {
    await ensureDB();
    const { default: ticketRoutes } = await import('../routes/ticket.routes.js');
    ticketRoutes(req, res, next);
  } catch (err) {
    console.error('Ticket route error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Users routes - lazy load
app.use('/api/users', async (req, res, next) => {
  try {
    await ensureDB();
    const { default: userRoutes } = await import('../routes/user.routes.js');
    userRoutes(req, res, next);
  } catch (err) {
    console.error('User route error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Lookups routes - lazy load
app.use('/api/lookups', async (req, res, next) => {
  try {
    await ensureDB();
    const { default: lookupRoutes } = await import('../routes/lookup.routes.js');
    lookupRoutes(req, res, next);
  } catch (err) {
    console.error('Lookup route error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Activities routes - lazy load
app.use('/api/activities', async (req, res, next) => {
  try {
    await ensureDB();
    const { default: activityRoutes } = await import('../routes/activity.routes.js');
    activityRoutes(req, res, next);
  } catch (err) {
    console.error('Activity route error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Settings routes - lazy load
app.use('/api/settings', async (req, res, next) => {
  try {
    await ensureDB();
    const { default: settingsRoutes } = await import('../routes/settings.routes.js');
    settingsRoutes(req, res, next);
  } catch (err) {
    console.error('Settings route error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// User rights routes - lazy load
app.use('/api/user-rights', async (req, res, next) => {
  try {
    await ensureDB();
    const { default: userRightRoutes } = await import('../routes/userRight.routes.js');
    userRightRoutes(req, res, next);
  } catch (err) {
    console.error('User rights route error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Notifications routes - lazy load
app.use('/api/notifications', async (req, res, next) => {
  try {
    await ensureDB();
    const { default: notificationRoutes } = await import('../routes/notification.routes.js');
    notificationRoutes(req, res, next);
  } catch (err) {
    console.error('Notification route error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

export default app;
