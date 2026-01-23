import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';

// Import all routes statically
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
import rmaRoutes from '../routes/rma.routes.js';
import assetUpdateRequestRoutes from '../routes/assetUpdateRequest.routes.js';
import reportingRoutes from '../routes/reporting.routes.js';

const app = express();

// Initialize DB connection
connectDB().catch(err => console.error('MongoDB connection error:', err.message));

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
// Dynamic CORS Configuration
const allowedOrigins = [
  'https://ucc-ticketing-tool.vercel.app',
  'https://ticketops.vluccc.com',
  'http://localhost:5173',
  ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN.replace(/\/$/, '')] : [])
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // Check if origin checks out
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      console.log('CORS blocked:', origin);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400, // Cache preflight for 24 hours - reduces OPTIONS requests
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Placeholder for Socket.io to prevent crashes in controllers that use req.app.get('io')
app.set('io', {
  to: () => ({ emit: () => { } }),
  emit: () => { }
});

// Note: DB connection is handled at app startup (line 26) and by mongoose auto-reconnect
// No per-request middleware needed - mongoose buffers commands if not connected

// Root endpoint for verification
app.get('/', (req, res) => {
  res.json({
    message: 'UCC Ticketing API - Production Live',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    dbState: mongoose.connection.readyState,
    environment: process.env.NODE_ENV,
    time: new Date().toISOString()
  });
});

// Register all routes
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
app.use('/api/rma', rmaRoutes);
app.use('/api/asset-update-requests', assetUpdateRequestRoutes);
app.use('/api/reporting', reportingRoutes);

// Static files (Mapped to /tmp for serverless runtime)
app.use('/uploads', express.static('/tmp'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Runtime Error:', err);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

export default app;
