import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import mongoose from 'mongoose';
import { createServer } from 'http';
import connectDB from './config/database.js';
import { setupCronJobs } from './cron-jobs.js';

// Load environment variables (only needed locally, Vercel provides them directly)
if (process.env.VERCEL !== '1') {
  dotenv.config();
}

// Initialize Express app
const app = express();

// Only create HTTP server and Socket.io in non-Vercel environments
let httpServer;
let io;

// Socket.io is only needed for local development, not in Vercel serverless
if (process.env.VERCEL !== '1') {
  // Dynamic import for Socket.io (only in local environment)
  import('socket.io').then(({ Server }) => {
    httpServer = createServer(app);

    // Initialize Socket.IO with flexible CORS for development
    io = new Server(httpServer, {
      cors: {
        origin: [
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:5175',
          'http://localhost:3000',
          process.env.CORS_ORIGIN || 'http://localhost:5173'
        ].filter(Boolean),
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
      },
      // Improve connection stability
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });

      // Join room for user-specific notifications
      socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined their room`);
      });

      // Join a specific ticket room for targeted updates
      socket.on('join:ticket', (ticketId) => {
        socket.join(`ticket_${ticketId}`);
        console.log(`Socket ${socket.id} joined room: ticket_${ticketId}`);
      });

      // Leave a ticket room
      socket.on('leave:ticket', (ticketId) => {
        socket.leave(`ticket_${ticketId}`);
        console.log(`Socket ${socket.id} left room: ticket_${ticketId}`);
      });
    });

    // Make io accessible to routes
    app.set('io', io);

    // Start server
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV}`);
      console.log(`🌐 CORS enabled for: ${process.env.CORS_ORIGIN}`);
    });
  }).catch(err => {
    console.error('Failed to initialize Socket.io:', err);
  });
}


// Database Connection Middleware (Ensures DB is connected before processing requests)
app.use(async (req, res, next) => {
  try {
    // Skip for root route if desired
    if (req.path === '/' || req.path === '/api/health') return next();

    await connectDB();

    // Safety check: ensure mongoose is actually connected
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection is not ready');
    }

    next();
  } catch (err) {
    console.error('❌ Database connection middleware error:', err.message);
    res.status(503).json({
      success: false,
      message: 'Database connection failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Setup cron jobs in non-serverless environments
if (process.env.VERCEL !== '1') {
  connectDB().then(() => {
    setupCronJobs();
  }).catch(err => console.error('MongoDB connection failed for cron jobs:', err));
}
// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'ws:'],
    }
  },
  crossOriginEmbedderPolicy: false, // Allow loading cross-origin resources
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true
})); // Enhanced security headers

// CORS Configuration - supports multiple origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://ticketops.vluccc.com',
  'https://ucc-ticketing-tool.vercel.app',
  'https://ucc-ticketing-tool-znae.vercel.app',
  // Add the CORS_ORIGIN from env (remove trailing slash if present)
  ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN.replace(/\/$/, '')] : [])
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    // Remove trailing slash from origin for comparison
    const normalizedOrigin = origin.replace(/\/$/, '');

    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow anyway for debugging, change to callback(new Error('Not allowed by CORS')) for strict mode
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(compression()); // Compress responses
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev')); // Logging (only in development)
}
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// Make io accessible to routes (only if it exists)
if (io) {
  app.set('io', io);
}


// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API Routes
import authRoutes from './routes/auth.routes.js';
import siteRoutes from './routes/site.routes.js';
import assetRoutes from './routes/asset.routes.js';
import ticketRoutes from './routes/ticket.routes.js';
import userRoutes from './routes/user.routes.js';
import lookupRoutes from './routes/lookup.routes.js';
import activityRoutes from './routes/activity.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import userRightRoutes from './routes/userRight.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import rmaRoutes from './routes/rma.routes.js';
import assetUpdateRequestRoutes from './routes/assetUpdateRequest.routes.js';
import reportingRoutes from './routes/reporting.routes.js';
import stockRoutes from './routes/stock.routes.js';
import worklogRoutes from './routes/worklog.routes.js';

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
app.use('/api/stock', stockRoutes);
app.use('/api/worklogs', worklogRoutes);

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Never log sensitive fields
  const safeMessage = err.message?.replace(/password|secret|key|token/gi, '[REDACTED]') || 'Internal Server Error';
  console.error('Error:', safeMessage);

  res.status(err.statusCode || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? safeMessage : 'Internal Server Error',
    // Never expose stack traces in production
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});


// Export the Express app for Vercel serverless
export default app;

