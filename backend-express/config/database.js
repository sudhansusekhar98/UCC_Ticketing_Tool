import mongoose from "mongoose";

const connectDB = async () => {
  try {
    console.log('🔄 Attempting to connect to MongoDB...');
    console.log('📍 Connection URI:', process.env.MONGODB_URI?.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') || 'NOT SET');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Connection timeout settings
      serverSelectionTimeoutMS: 10000, // Timeout after 10 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      // Use IPv4 first for DNS resolution (helps with some network configs)
      family: 4
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error(" MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn(" MongoDB disconnected");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("MongoDB connection closed through app termination");
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);
    if (!process.env.MONGODB_URI) {
      console.error("⚠️ MONGODB_URI is not defined in environment variables!");
    }
    // In serverless, we don't want to exit the process as it kills the function cold
    if (process.env.VERCEL !== '1') {
      process.exit(1);
    }
  }
};

export default connectDB;
