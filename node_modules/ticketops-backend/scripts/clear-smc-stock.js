import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const SiteSchema = new mongoose.Schema({ siteName: String });
const AssetSchema = new mongoose.Schema({ status: String, siteId: mongoose.Schema.Types.ObjectId, assetCode: String, assetType: String });

const Site = mongoose.model('Site', SiteSchema);
const Asset = mongoose.model('Asset', AssetSchema);

async function clearSMCStock() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find the site
        const site = await Site.findOne({ siteName: /Sambalpur Municipal Corporation/i });
        if (!site) {
            console.log('Site "Sambalpur Municipal Corporation – SMC" not found!');
            // List all sites to help debug
            const allSites = await Site.find({}, 'siteName');
            console.log('Available sites:', allSites.map(s => s.siteName));
            process.exit(1);
        }

        console.log(`Found site: "${site.siteName}" (ID: ${site._id})`);

        // Count stock assets for this site
        const stockCount = await Asset.countDocuments({ siteId: site._id, status: 'Spare' });
        console.log(`Found ${stockCount} spare stock items for this site`);

        if (stockCount > 0) {
            const result = await Asset.deleteMany({ siteId: site._id, status: 'Spare' });
            console.log(`Successfully deleted ${result.deletedCount} stock items.`);
        } else {
            console.log('No spare stock items found for this site.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

clearSMCStock();
