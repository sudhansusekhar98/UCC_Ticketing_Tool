import mongoose from "mongoose";

// Cache the connection for serverless environments
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // If already connected, return the cached connection
  if (cached.conn && cached.conn.connection.readyState === 1) {
    return cached.conn;
  }

  // If disconnected but cached, reset
  if (cached.conn && cached.conn.connection.readyState !== 2) {
    cached.conn = null;
    cached.promise = null;
  }

  // If a connection is in progress, wait for it
  if (cached.promise) {
    cached.conn = await cached.promise;
    return cached.conn;
  }

  try {
    console.log('🔄 Attempting to connect to MongoDB...');
    console.log('📍 Connection URI:', process.env.MONGODB_URI?.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') || 'NOT SET');

    // Optimized settings for serverless/Vercel
    const options = {
      // Faster connection timeouts for serverless
      serverSelectionTimeoutMS: 5000, // Reduced from 30s - fail fast on cold starts
      connectTimeoutMS: 5000, // Fast connection timeout
      socketTimeoutMS: 45000, // Socket timeout
      // Buffer commands until connection is established
      bufferCommands: true,
      // Connection pool optimized for serverless
      maxPoolSize: 5, // Reduced for serverless (fewer connections)
      minPoolSize: 0, // Allow pool to shrink to 0
      maxIdleTimeMS: 10000, // Close idle connections after 10s
      // Use IPv4 first for DNS resolution
      family: 4,
      // Retry writes
      retryWrites: true,
      // Write concern
      w: 'majority'
    };

    cached.promise = mongoose.connect(process.env.MONGODB_URI, options);
    cached.conn = await cached.promise;

    console.log(`✅ MongoDB Connected: ${cached.conn.connection.host}`);
    console.log(`📊 Database: ${cached.conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
      // Reset cache on error
      cached.conn = null;
      cached.promise = null;
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected");
      // Reset cache on disconnect
      cached.conn = null;
      cached.promise = null;
    });

    // Graceful shutdown (only for non-serverless)
    if (process.env.VERCEL !== '1') {
      process.on("SIGINT", async () => {
        await mongoose.connection.close();
        console.log("MongoDB connection closed through app termination");
        process.exit(0);
      });
    }

    return cached.conn;
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);
    // Reset cache on error
    cached.promise = null;
    cached.conn = null;

    if (!process.env.MONGODB_URI) {
      console.error("⚠️ MONGODB_URI is not defined in environment variables!");
    }
    // In serverless, we don't want to exit the process as it kills the function cold
    if (process.env.VERCEL !== '1') {
      process.exit(1);
    }
    throw error;
  }
};

export default connectDB;

