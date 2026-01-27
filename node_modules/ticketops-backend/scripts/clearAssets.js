import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function clearAssets() {
    try {
        console.log('Connecting to MongoDB Atlas...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas');

        // Get the assets collection
        const db = mongoose.connection.db;
        const assetsCollection = db.collection('assets');

        // Count existing assets
        const count = await assetsCollection.countDocuments();
        console.log(`Found ${count} assets in the database.`);

        if (count === 0) {
            console.log('No assets to delete.');
        } else {
            // Delete all assets
            const result = await assetsCollection.deleteMany({});
            console.log(`✅ Successfully deleted ${result.deletedCount} assets.`);
        }

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

clearAssets();
