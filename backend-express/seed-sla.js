import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SLAPolicy from './models/SLAPolicy.model.js';

dotenv.config();

const policies = [
    {
        policyName: 'P1 - Critical Priority',
        priority: 'P1',
        responseTimeMinutes: 15,
        restoreTimeMinutes: 60,
        escalationLevel1Minutes: 30,
        escalationLevel2Minutes: 45,
        escalationL1Emails: 'supervisor@ticketops.vluccc.com',
        escalationL2Emails: 'admin@ticketops.vluccc.com',
        isActive: true
    },
    {
        policyName: 'P2 - High Priority',
        priority: 'P2',
        responseTimeMinutes: 30,
        restoreTimeMinutes: 240,
        escalationLevel1Minutes: 120,
        escalationLevel2Minutes: 180,
        escalationL1Emails: 'supervisor@ticketops.vluccc.com',
        escalationL2Emails: 'admin@ticketops.vluccc.com',
        isActive: true
    },
    {
        policyName: 'P3 - Medium Priority',
        priority: 'P3',
        responseTimeMinutes: 60,
        restoreTimeMinutes: 480,
        escalationLevel1Minutes: 240,
        escalationLevel2Minutes: 360,
        escalationL1Emails: 'supervisor@ticketops.vluccc.com',
        escalationL2Emails: 'admin@ticketops.vluccc.com',
        isActive: true
    },
    {
        policyName: 'P4 - Low Priority',
        priority: 'P4',
        responseTimeMinutes: 120,
        restoreTimeMinutes: 1440,
        escalationLevel1Minutes: 720,
        escalationLevel2Minutes: 1080,
        escalationL1Emails: 'supervisor@ticketops.vluccc.com',
        escalationL2Emails: 'admin@ticketops.vluccc.com',
        isActive: true
    }
];

async function seedSLA() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const count = await SLAPolicy.countDocuments();
        if (count > 0) {
            console.log('SLA Policies already exist. Skipping.');
        } else {
            await SLAPolicy.insertMany(policies);
            console.log('SLA Policies seeded successfully');
        }

    } catch (error) {
        console.error('Error seeding SLA:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seedSLA();
