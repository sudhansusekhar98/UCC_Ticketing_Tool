import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const Asset = mongoose.model('Asset', new mongoose.Schema({ status: String }));
const Requisition = mongoose.model('Requisition', new mongoose.Schema({}));
const StockTransfer = mongoose.model('StockTransfer', new mongoose.Schema({}));

async function clearStock() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const assetCount = await Asset.countDocuments({ status: { $in: ['Spare', 'InTransit'] } });
        console.log(`Found ${assetCount} stock items (Spare/InTransit)`);

        if (assetCount > 0) {
            const result = await Asset.deleteMany({ status: { $in: ['Spare', 'InTransit'] } });
            console.log(`Successfully deleted ${result.deletedCount} assets.`);
        } else {
            console.log('No stock assets found to delete.');
        }

        // Also clean up stock-related records to avoid broken references
        const reqResult = await Requisition.deleteMany({});
        const transResult = await StockTransfer.deleteMany({});
        console.log(`Cleaned up ${reqResult.deletedCount} requisitions and ${transResult.deletedCount} stock transfers.`);

        process.exit(0);
    } catch (error) {
        console.error('Error clearing stock:', error);
        process.exit(1);
    }
}

clearStock();
