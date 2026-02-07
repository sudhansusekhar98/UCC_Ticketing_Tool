import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const listSites = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Site = mongoose.model('Site', new mongoose.Schema({ siteName: String, siteUniqueID: String }));
        const sites = await Site.find({}, 'siteName siteUniqueID');
        console.log(JSON.stringify(sites, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

listSites();
