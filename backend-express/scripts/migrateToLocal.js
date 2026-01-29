import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const REMOTE_URI = process.env.MONGODB_URI;
const LOCAL_URI = 'mongodb://localhost:27017/ucc_ticketing';

async function migrate() {
    let remoteClient, localClient;
    try {
        console.log('--- Database Migration ---');
        console.log('Remote:', REMOTE_URI.split('@')[1] || REMOTE_URI); // Hide credentials in log
        console.log('Local:', LOCAL_URI);
        console.log('--------------------------');

        console.log('Connecting to Remote Atlas...');
        remoteClient = await MongoClient.connect(REMOTE_URI);
        const remoteDb = remoteClient.db();

        console.log('Connecting to Local MongoDB (Please ensure it is running)...');
        localClient = await MongoClient.connect(LOCAL_URI);
        const localDb = localClient.db();

        const collections = await remoteDb.listCollections().toArray();
        console.log(`Found ${collections.length} collections to migrate.`);

        for (const col of collections) {
            const name = col.name;
            if (name.startsWith('system.')) continue;

            console.log(`Migrating collection: ${name}...`);
            const data = await remoteDb.collection(name).find({}).toArray();

            // Clear local collection to avoid duplicates or ID conflicts
            await localDb.collection(name).deleteMany({});

            if (data.length > 0) {
                await localDb.collection(name).insertMany(data);
                console.log(`  ✅ Successfully moved ${data.length} documents.`);
            } else {
                console.log(`  ℹ️ Collection ${name} is empty.`);
            }
        }

        console.log('\n✨ Migration Completed Successfully!');
        console.log('You can now update your MONGODB_URI in .env to use localhost.');
        process.exit(0);
    } catch (error) {
        if (error.message.includes('ECONNREFUSED')) {
            console.error('\n❌ Error: Could not connect to LOCAL MongoDB.');
            console.error('Please make sure your MongoDB service is running (e.g., Run "net start MongoDB" or "mongod").');
        } else {
            console.error('\n❌ Migration failed:', error.message);
        }
        process.exit(1);
    } finally {
        if (remoteClient) await remoteClient.close();
        if (localClient) await localClient.close();
    }
}

migrate();
