import mongoose from 'mongoose';
import User from './models/User.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ucc-ticketing');
    const users = await User.find({ role: { $ne: 'Admin' } }).populate('siteId');
    console.log(JSON.stringify(users, null, 2));
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkUsers();
