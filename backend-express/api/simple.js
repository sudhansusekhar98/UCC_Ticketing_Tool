// Ultra-minimal test handler for Vercel
export default function handler(req, res) {
  try {
    // Test if basic Node.js works
    const envCheck = {
      hasMongoUri: !!process.env.MONGODB_URI,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasCors: !!process.env.CORS_ORIGIN,
      nodeVersion: process.version,
      platform: process.platform
    };

    res.status(200).json({
      status: 'OK',
      message: 'Vercel serverless function is working!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'not set',
      vercel: process.env.VERCEL || 'not set',
      envCheck
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}
