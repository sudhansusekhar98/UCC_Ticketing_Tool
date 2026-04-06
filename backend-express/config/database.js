import mongoose from "mongoose";

// Cache the connection (prevents multiple connections in the same process)
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

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  try {
    console.log('🔄 Attempting to connect to MongoDB...');
    console.log('📍 Connection URI:', process.env.MONGODB_URI?.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') || 'NOT SET');

    const options = {
      // Connection timeouts
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      // Buffer commands until connection is established
      bufferCommands: true,
      // Connection pool for long-running EB process
      maxPoolSize: 20,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
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
      cached.conn = null;
      cached.promise = null;
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected. Will reconnect on next request.");
      cached.conn = null;
      cached.promise = null;
    });

    mongoose.connection.on("reconnected", () => {
      console.log("🔄 MongoDB reconnected");
    });

    return cached.conn;
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);
    cached.promise = null;
    cached.conn = null;

    if (!process.env.MONGODB_URI) {
      console.error("⚠️ MONGODB_URI is not defined in environment variables!");
    }
    throw error;
  }
};

export default connectDB;
