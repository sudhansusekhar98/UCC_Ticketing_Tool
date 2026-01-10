import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import connectDB from '../config/database.js';

// Import routes synchronously
import authRoutes from '../routes/auth.routes.js';
import siteRoutes from '../routes/site.routes.js';
import assetRoutes from '../routes/asset.routes.js';
import ticketRoutes from '../routes/ticket.routes.js';
import userRoutes from '../routes/user.routes.js';
import lookupRoutes from '../routes/lookup.routes.js';
import activityRoutes from '../routes/activity.routes.js';
import settingsRoutes from '../routes/settings.routes.js';
import userRightRoutes from '../routes/userRight.routes.js';
import notificationRoutes from '../routes/notification.routes.js';

// Initialize Express app
const app = express();

// Connect to MongoDB (async, non-blocking)
connectDB().catch(err => console.error('MongoDB connection failed:', err));

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

// API Routes - Register synchronously
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
