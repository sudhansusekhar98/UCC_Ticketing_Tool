// ============================================================================
// Migration Script: Encrypt Existing Asset Sensitive Fields
// ============================================================================
// This script reads all assets with plaintext sensitive fields and 
// encrypts them in-place using AES-256-GCM.
//
// Run: node scripts/encrypt-existing-assets.js
//
// IMPORTANT:
// - Set ENCRYPTION_KEY in .env before running
// - Back up your database first
// - This is idempotent (won't double-encrypt already encrypted values)
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { encrypt, isEncrypted } from '../utils/encryption.utils.js';

const SENSITIVE_FIELDS = ['ipAddress', 'mac', 'serialNumber', 'password', 'userName'];

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in environment');
    process.exit(1);
}

if (!process.env.ENCRYPTION_KEY) {
    console.error('❌ ENCRYPTION_KEY is not set in environment');
    console.error('   Generate one: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
}

async function migrateAssets() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const assetsCollection = db.collection('assets');

        const totalCount = await assetsCollection.countDocuments();
        console.log(`📊 Total assets in database: ${totalCount}`);

        const cursor = assetsCollection.find({});
        let processed = 0;
        let encrypted = 0;
        let skipped = 0;
        let errors = 0;

        while (await cursor.hasNext()) {
            const asset = await cursor.next();
            processed++;

            const updates = {};
            let hasUpdates = false;

            for (const field of SENSITIVE_FIELDS) {
                const value = asset[field];
                if (value && typeof value === 'string' && value.trim() !== '' && !isEncrypted(value)) {
                    try {
                        updates[field] = encrypt(value);
                        hasUpdates = true;
                    } catch (err) {
                        console.error(`  ❌ Failed to encrypt ${field} on ${asset.assetCode}: ${err.message}`);
                        errors++;
                    }
                }
            }

            if (hasUpdates) {
                await assetsCollection.updateOne(
                    { _id: asset._id },
                    { $set: updates }
                );
                encrypted++;
                if (encrypted % 100 === 0) {
                    console.log(`  🔒 Encrypted ${encrypted} assets so far...`);
                }
            } else {
                skipped++;
            }
        }

        console.log('\n============================================');
        console.log('  MIGRATION COMPLETE');
        console.log('============================================');
        console.log(`  Total processed: ${processed}`);
        console.log(`  Encrypted:       ${encrypted}`);
        console.log(`  Skipped:         ${skipped} (already encrypted or empty)`);
        console.log(`  Errors:          ${errors}`);
        console.log('============================================\n');

        // Also encrypt AssetUpdateRequest fields
        console.log('🔄 Processing AssetUpdateRequest collection...');
        const aurCollection = db.collection('assetupdaterequests');
        const aurCount = await aurCollection.countDocuments();
        console.log(`📊 Total update requests: ${aurCount}`);

        const aurCursor = aurCollection.find({});
        let aurEncrypted = 0;

        while (await aurCursor.hasNext()) {
            const doc = await aurCursor.next();
            const updates = {};
            let hasUpdates = false;

            // Encrypt proposedChanges fields
            if (doc.proposedChanges) {
                for (const field of ['serialNumber', 'ipAddress', 'mac', 'userName', 'password']) {
                    const value = doc.proposedChanges[field];
                    if (value && typeof value === 'string' && !isEncrypted(value)) {
                        updates[`proposedChanges.${field}`] = encrypt(value);
                        hasUpdates = true;
                    }
                }
            }

            // Encrypt originalValues fields
            if (doc.originalValues) {
                for (const field of ['serialNumber', 'ipAddress', 'mac', 'userName']) {
                    const value = doc.originalValues[field];
                    if (value && typeof value === 'string' && !isEncrypted(value)) {
                        updates[`originalValues.${field}`] = encrypt(value);
                        hasUpdates = true;
                    }
                }
            }

            if (hasUpdates) {
                await aurCollection.updateOne(
                    { _id: doc._id },
                    { $set: updates }
                );
                aurEncrypted++;
            }
        }

        console.log(`  🔒 Encrypted ${aurEncrypted} asset update requests`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

migrateAssets();
