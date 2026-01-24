import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { hashPassword } from '../utils/auth.utils.js';

// Import all models
import User from '../models/User.model.js';
import Site from '../models/Site.model.js';
import Asset from '../models/Asset.model.js';
import Ticket from '../models/Ticket.model.js';
import SLAPolicy from '../models/SLAPolicy.model.js';
import TicketActivity from '../models/TicketActivity.model.js';
import WorkOrder from '../models/WorkOrder.model.js';
import Notification from '../models/Notification.model.js';
import NotificationLog from '../models/NotificationLog.model.js';
import AssetUpdateRequest from '../models/AssetUpdateRequest.model.js';
import RMARequest from '../models/RMARequest.model.js';
import TicketAttachment from '../models/TicketAttachment.model.js';
import UserRight from '../models/UserRight.model.js';
import DeviceType from '../models/DeviceType.model.js';

dotenv.config();

const cleanData = async () => {
    try {
        console.log('🧹 Starting cleanup process...');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Array of models to clear
        const models = [
            { name: 'TicketActivity', model: TicketActivity },
            { name: 'TicketAttachment', model: TicketAttachment },
            { name: 'WorkOrder', model: WorkOrder },
            { name: 'Ticket', model: Ticket },
            { name: 'AssetUpdateRequest', model: AssetUpdateRequest },
            { name: 'RMARequest', model: RMARequest },
            { name: 'NotificationLog', model: NotificationLog },
            { name: 'Notification', model: Notification },
            { name: 'Asset', model: Asset },
            { name: 'UserRight', model: UserRight },
            { name: 'DeviceType', model: DeviceType },
            { name: 'Site', model: Site },
            { name: 'SLAPolicy', model: SLAPolicy },
            { name: 'User', model: User }, // Clear users last-ish, but order doesn't strictly matter with deleteMany
        ];

        // Clear system settings (using direct collection access as it might not have a model file or I missed it)
        // seed-full.js used: mongoose.connection.collection('systemsettings')
        try {
            await mongoose.connection.collection('systemsettings').deleteMany({});
            console.log('🗑️  Cleared: System Settings');
        } catch (err) {
            console.log('⚠️  System Settings collection might not exist or error clearing:', err.message);
        }

        // Clear all collections
        for (const { name, model } of models) {
            const result = await model.deleteMany({});
            console.log(`🗑️  Cleared ${name}: ${result.deletedCount} documents`);
        }

        console.log('✨ All dummy data removed.');

        // Re-create Admin User
        console.log('\n👤 Re-creating default Admin user...');

        const adminPassword = await hashPassword('Admin@123');

        const adminUser = await User.create({
            fullName: 'System Administrator',
            email: 'admin@uccticket.com', // Using the email from seed.js
            username: 'admin',
            passwordHash: adminPassword,
            role: 'Admin',
            designation: 'System Administrator',
            mobileNumber: '9999999999',
            isActive: true
        });

        console.log(`✅ Admin user created: ${adminUser.username} (${adminUser.email})`);
        console.log('🔑 Password: Admin@123');

        console.log('\n🎉 Cleanup complete!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error cleaning data:', error);
        process.exit(1);
    }
};

cleanData();
