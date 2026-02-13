import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Asset from '../models/Asset.model.js';
import '../models/Site.model.js';

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);

    const rawAsset = await mongoose.connection.db.collection('assets').findOne(
        { password: { $exists: true, $ne: null, $ne: '' } }
    );

    // Fetch WITHOUT populate to avoid model registration issues
    const asset = await Asset.findById(rawAsset._id);

    // Simulate exactly what processAssetForResponse does
    const decrypted = Asset.decryptSensitiveFields(asset);

    // Simulate JSON.stringify (what res.json does)
    const jsonOutput = JSON.stringify({ success: true, data: decrypted });
    const parsed = JSON.parse(jsonOutput);

    console.log('Has password in JSON:', 'password' in parsed.data);
    console.log('Password value:', parsed.data.password);
    console.log('Has userName in JSON:', 'userName' in parsed.data);
    console.log('userName value:', parsed.data.userName);
    console.log('Has ipAddress:', 'ipAddress' in parsed.data);
    console.log('ipAddress value:', parsed.data.ipAddress);

    process.exit(0);
}
check().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
