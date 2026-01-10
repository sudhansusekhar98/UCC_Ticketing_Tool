import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

// Initialize Express app
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

// Connect to MongoDB (async, non-blocking)
import('./config/database.js').then(({ default: connectDB }) => {
  connectDB().catch(err => console.error('MongoDB connection failed:', err));
}).catch(err => console.error('Failed to import database config:', err));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'UCC Ticketing API',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    mongodb: process.env.MONGODB_URI ? 'configured' : 'not configured',
    uptime: process.uptime()
  });
});

// Import and use routes (dynamic import to avoid blocking)
Promise.all([
  import('./routes/auth.routes.js'),
  import('./routes/site.routes.js'),
  import('./routes/asset.routes.js'),
  import('./routes/ticket.routes.js'),
  import('./routes/user.routes.js'),
  import('./routes/lookup.routes.js'),
  import('./routes/activity.routes.js'),
  import('./routes/settings.routes.js'),
  import('./routes/userRight.routes.js'),
  import('./routes/notification.routes.js')
]).then(([
  { default: authRoutes },
  { default: siteRoutes },
  { default: assetRoutes },
  { default: ticketRoutes },
  { default: userRoutes },
  { default: lookupRoutes },
  { default: activityRoutes },
  { default: settingsRoutes },
  { default: userRightRoutes },
  { default: notificationRoutes }
]) => {
  app.use('/api/auth', authRoutes);
  app.use('/api/sites', siteRoutes);
  app.use('/api/assets', assetRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/lookups', lookupRoutes);
  app.use('/api/activities', activityRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/user-rights', userRightRoutes);
  app.use('/api/notifications', notificationRoutes);
  
  console.log('✅ All routes loaded successfully');
}).catch(err => {
  console.error('❌ Failed to load routes:', err);
});

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack 
    })
  });
});

// Export for Vercel serverless
export default app;
