/**
 * MongoDB Migration Script
 * Migrates data from local MongoDB to MongoDB Atlas (Cloud)
 * 
 * Usage: node scripts/migrate-to-cloud.js
 */

import mongoose from 'mongoose';

// Configuration
const LOCAL_MONGODB_URI = 'mongodb://localhost:27017/ucc_ticketing';
const CLOUD_MONGODB_URI = 'mongodb+srv://sekhar_db_user:duIt4u0UJmxyozxM@vlaccess.4xch4e4.mongodb.net/ucc_ticketing?retryWrites=true&w=majority';

async function migrateData() {
    let localConnection = null;
    let cloudConnection = null;
    
    try {
        console.log('🚀 Starting MongoDB Migration...\n');
        
        // Connect to local MongoDB
        console.log('📡 Connecting to local MongoDB...');
        localConnection = await mongoose.createConnection(LOCAL_MONGODB_URI);
        
        // Wait for connection to be ready
        await new Promise((resolve) => {
            if (localConnection.readyState === 1) {
                resolve();
            } else {
                localConnection.once('open', resolve);
            }
        });
        console.log('✅ Connected to local MongoDB\n');
        
        // Connect to MongoDB Atlas
        console.log('☁️  Connecting to MongoDB Atlas...');
        cloudConnection = await mongoose.createConnection(CLOUD_MONGODB_URI);
        
        // Wait for connection to be ready
        await new Promise((resolve) => {
            if (cloudConnection.readyState === 1) {
                resolve();
            } else {
                cloudConnection.once('open', resolve);
            }
        });
        console.log('✅ Connected to MongoDB Atlas\n');
        
        // Get list of collections from local database
        console.log('📋 Fetching collections from local database...');
        const collections = await localConnection.db.collections();
        const localCollectionNames = collections.map(c => c.collectionName);
        
        if (localCollectionNames.length === 0) {
            console.log('⚠️  No collections found in local database!');
            return;
        }
        
        console.log('📋 Collections found:', localCollectionNames.join(', '));
        console.log('');
        
        let totalDocumentsMigrated = 0;
        
        // Migrate each collection
        for (const collectionName of localCollectionNames) {
            try {
                console.log(`\n📦 Migrating collection: ${collectionName}`);
                
                // Get all documents from local collection
                const localCollection = localConnection.db.collection(collectionName);
                const documents = await localCollection.find({}).toArray();
                
                if (documents.length === 0) {
                    console.log(`   ⚪ No documents to migrate`);
                    continue;
                }
                
                console.log(`   📄 Found ${documents.length} documents`);
                
                // Get or create cloud collection
                const cloudCollection = cloudConnection.db.collection(collectionName);
                
                // Check if collection already has data in cloud
                const existingCount = await cloudCollection.countDocuments();
                if (existingCount > 0) {
                    console.log(`   ⚠️  Cloud collection already has ${existingCount} documents`);
                    console.log(`   🔄 Clearing existing data...`);
                    await cloudCollection.deleteMany({});
                }
                
                // Insert documents to cloud
                const result = await cloudCollection.insertMany(documents, { ordered: false });
                console.log(`   ✅ Migrated ${result.insertedCount} documents`);
                totalDocumentsMigrated += result.insertedCount;
                
            } catch (collectionError) {
                console.log(`   ❌ Error migrating ${collectionName}:`, collectionError.message);
            }
        }
        
        console.log('\n' + '='.repeat(50));
        console.log(`🎉 Migration Complete!`);
        console.log(`📊 Total documents migrated: ${totalDocumentsMigrated}`);
        console.log('='.repeat(50));
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error.stack);
        throw error;
    } finally {
        // Close connections
        if (localConnection) {
            await localConnection.close();
            console.log('\n🔌 Local connection closed');
        }
        if (cloudConnection) {
            await cloudConnection.close();
            console.log('🔌 Cloud connection closed');
        }
    }
}

// Run migration
migrateData()
    .then(() => {
        console.log('\n✨ Migration script finished successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration script failed:', error);
        process.exit(1);
    });
