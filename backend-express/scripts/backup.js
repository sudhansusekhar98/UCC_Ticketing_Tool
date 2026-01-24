import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import all models (reusing the list from clean.js/seed.js context)
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupData = async () => {
    try {
        console.log('📦 Starting backup process...');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Create backup directory with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, '..', 'backups', `backup-${timestamp}`);

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        console.log(`📂 Backup directory created: ${backupDir}`);

        // Array of models to backup
        const models = [
            { name: 'User', model: User },
            { name: 'Site', model: Site },
            { name: 'Asset', model: Asset },
            { name: 'Ticket', model: Ticket },
            { name: 'SLAPolicy', model: SLAPolicy },
            { name: 'TicketActivity', model: TicketActivity },
            { name: 'WorkOrder', model: WorkOrder },
            { name: 'Notification', model: Notification },
            { name: 'NotificationLog', model: NotificationLog },
            { name: 'AssetUpdateRequest', model: AssetUpdateRequest },
            { name: 'RMARequest', model: RMARequest },
            { name: 'TicketAttachment', model: TicketAttachment },
            { name: 'UserRight', model: UserRight },
            { name: 'DeviceType', model: DeviceType }
        ];

        // Backup System Settings separately
        try {
            const settings = await mongoose.connection.collection('systemsettings').find({}).toArray();
            fs.writeFileSync(path.join(backupDir, 'SystemSettings.json'), JSON.stringify(settings, null, 2));
            console.log(`✅ Backed up SystemSettings: ${settings.length} documents`);
        } catch (err) {
            console.log(`⚠️  Could not backup SystemSettings: ${err.message}`);
        }

        // Backup all other models
        for (const { name, model } of models) {
            const data = await model.find({});
            fs.writeFileSync(path.join(backupDir, `${name}.json`), JSON.stringify(data, null, 2));
            console.log(`✅ Backed up ${name}: ${data.length} documents`);
        }

        console.log(`\n🎉 Backup complete! stored in: ${backupDir}`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Error backing up data:', error);
        process.exit(1);
    }
};

backupData();
