import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function checkUserRights() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find the user
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
        const UserRight = mongoose.model('UserRight', new mongoose.Schema({}, { strict: false }), 'userrights');

        const user = await User.findOne({ fullName: /Sudhansu Pradhan/i });

        if (!user) {
            console.log('❌ User "Sudhansu Pradhan" not found');
            await mongoose.disconnect();
            return;
        }

        console.log('👤 User Found:');
        console.log('   ID:', user._id);
        console.log('   Name:', user.fullName);
        console.log('   Email:', user.email);
        console.log('   Role:', user.role);
        console.log('   Assigned Sites:', user.assignedSites);
        console.log('');

        // Find user rights
        const userRights = await UserRight.findOne({ user: user._id });

        if (!userRights) {
            console.log('❌ No UserRight document found for this user');
        } else {
            console.log('🔐 User Rights Found:');
            console.log('   Global Rights:', userRights.globalRights || []);
            console.log('   Site Rights:');
            if (userRights.siteRights && userRights.siteRights.length > 0) {
                for (const sr of userRights.siteRights) {
                    console.log('     - Site:', sr.site, '| Rights:', sr.rights);
                }
            } else {
                console.log('     (none)');
            }
        }

        // Check if MANAGE_SITE_STOCK is in any rights
        const hasStockRight =
            userRights?.globalRights?.includes('MANAGE_SITE_STOCK') ||
            userRights?.siteRights?.some(sr => sr.rights?.includes('MANAGE_SITE_STOCK'));

        console.log('\n📦 Has MANAGE_SITE_STOCK permission:', hasStockRight ? '✅ YES' : '❌ NO');

        await mongoose.disconnect();
        console.log('\n✅ Done');
    } catch (error) {
        console.error('Error:', error.message);
        await mongoose.disconnect();
    }
}

checkUserRights();
