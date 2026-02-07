import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const findAngulAndClear = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Site = mongoose.model('Site', new mongoose.Schema({ siteName: String, siteUniqueID: String }));
        const Asset = mongoose.model('Asset', new mongoose.Schema({ siteId: mongoose.Schema.Types.ObjectId, status: String }));

        const sites = await Site.find({ siteName: /Angul/i });
        if (sites.length === 0) {
            console.log("❌ No site found containing 'Angul'");
            // Let's print all sites to be sure
            const allSites = await Site.find({}, 'siteName siteUniqueID');
            console.log("All sites:", allSites.map(s => s.siteName));
            process.exit(1);
        }

        for (const site of sites) {
            console.log(`📍 Found Site: ${site.siteName} (${site._id})`);
            const count = await Asset.countDocuments({ siteId: site._id, status: 'Spare' });
            console.log(`📦 Found ${count} stock items (status: 'Spare')`);
            if (count > 0) {
                const res = await Asset.deleteMany({ siteId: site._id, status: 'Spare' });
                console.log(`✅ Deleted ${res.deletedCount} items.`);
            }
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

findAngulAndClear();
