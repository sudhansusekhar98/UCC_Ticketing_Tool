import mongoose from "mongoose";

// Cache the connection for serverless environments
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // FAST PATH: If already connected, return synchronously
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If already connecting, wait for the existing promise
  if (cached.promise) {
    return await cached.promise;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  try {
    console.log('🔄 Attempting to connect to MongoDB...');

    // Optimized settings for serverless/Vercel
    const options = {
      // Standard connection timeouts
      serverSelectionTimeoutMS: 20000,
      connectTimeoutMS: 20000,
      socketTimeoutMS: 45000,
      // Buffer commands until connection is established
      bufferCommands: true,
      // VERY IMPORTANT for serverless: fail buffered commands if connection takes too long
      bufferTimeoutMS: 15000,

      // Connection pool optimized for serverless (lowered to reduce overhead)
      maxPoolSize: 10,
      minPoolSize: 0,
      maxIdleTimeMS: 10000,

      // DNS/Health checks
      family: 4,
      retryWrites: true,
      w: 'majority',
      heartbeatFrequencyMS: 10000
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

