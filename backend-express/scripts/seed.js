import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import SLAPolicy from '../models/SLAPolicy.model.js';
import { hashPassword } from '../utils/auth.utils.js';

dotenv.config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to keep existing data)
    await User.deleteMany({});
    await SLAPolicy.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create default users
    const users = [
      {
        fullName: 'System Administrator',
        email: 'admin@uccticket.com',
        username: 'admin',
        passwordHash: await hashPassword('Admin@123'),
        role: 'Admin',
        designation: 'System Administrator',
        mobileNumber: '9999999999',
        isActive: true
      },
      {
        fullName: 'Dispatcher User',
        email: 'dispatcher@uccticket.com',
        username: 'dispatcher',
        passwordHash: await hashPassword('Dispatcher@123'),
        role: 'Dispatcher',
        designation: 'Ticket Dispatcher',
        mobileNumber: '9999999998',
        isActive: true
      },
      {
        fullName: 'L1 Engineer',
        email: 'l1engineer@uccticket.com',
        username: 'l1engineer',
        passwordHash: await hashPassword('Engineer@123'),
        role: 'L1Engineer',
        designation: 'Field Engineer L1',
        mobileNumber: '9999999997',
        isActive: true
      },
      {
        fullName: 'L2 Engineer',
        email: 'l2engineer@uccticket.com',
        username: 'l2engineer',
        passwordHash: await hashPassword('Engineer@123'),
        role: 'L2Engineer',
        designation: 'Senior Engineer L2',
        mobileNumber: '9999999996',
        isActive: true
      },
      {
        fullName: 'Supervisor',
        email: 'supervisor@uccticket.com',
        username: 'supervisor',
        passwordHash: await hashPassword('Supervisor@123'),
        role: 'Supervisor',
        designation: 'Operations Supervisor',
        mobileNumber: '9999999995',
        isActive: true
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log(`✅ Created ${createdUsers.length} users`);

    // Create default SLA policies
    const slaPolicies = [
      {
        policyName: 'P1 - Critical',
        priority: 'P1',
        responseTimeMinutes: 15,
        restoreTimeMinutes: 60,
        escalationLevel1Minutes: 30,
        escalationLevel2Minutes: 45,
        escalationL1Emails: 'supervisor@uccticket.com',
        escalationL2Emails: 'admin@uccticket.com',
        isActive: true
      },
      {
        policyName: 'P2 - High',
        priority: 'P2',
        responseTimeMinutes: 30,
        restoreTimeMinutes: 240,
        escalationLevel1Minutes: 120,
        escalationLevel2Minutes: 180,
        escalationL1Emails: 'supervisor@uccticket.com',
        escalationL2Emails: 'admin@uccticket.com',
        isActive: true
      },
      {
        policyName: 'P3 - Medium',
        priority: 'P3',
        responseTimeMinutes: 60,
        restoreTimeMinutes: 480,
        escalationLevel1Minutes: 240,
        escalationLevel2Minutes: 360,
        escalationL1Emails: 'supervisor@uccticket.com',
        escalationL2Emails: 'admin@uccticket.com',
        isActive: true
      },
      {
        policyName: 'P4 - Low',
        priority: 'P4',
        responseTimeMinutes: 120,
        restoreTimeMinutes: 1440,
        escalationLevel1Minutes: 720,
        escalationLevel2Minutes: 1080,
        escalationL1Emails: 'supervisor@uccticket.com',
        escalationL2Emails: 'admin@uccticket.com',
        isActive: true
      }
    ];

    const createdPolicies = await SLAPolicy.insertMany(slaPolicies);
    console.log(`✅ Created ${createdPolicies.length} SLA policies`);

    console.log('\n🎉 Seed data created successfully!\n');
    console.log('📝 Default Login Credentials:');
    console.log('━'.repeat(50));
    console.log('Admin:      username: admin      | password: Admin@123');
    console.log('Dispatcher: username: dispatcher | password: Dispatcher@123');
    console.log('L1 Engineer: username: l1engineer | password: Engineer@123');
    console.log('L2 Engineer: username: l2engineer | password: Engineer@123');
    console.log('Supervisor: username: supervisor | password: Supervisor@123');
    console.log('━'.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
