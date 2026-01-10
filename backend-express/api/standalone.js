import express from 'express';
import cors from 'cors';

const app = express();

// Basic middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Test endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'UCC Ticketing API - Standalone Test',
    status: 'working',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    environment: process.env.NODE_ENV,
    hasMongoUri: !!process.env.MONGODB_URI
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export default app;
