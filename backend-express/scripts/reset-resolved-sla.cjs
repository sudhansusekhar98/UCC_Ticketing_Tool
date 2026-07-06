'use strict';
/**
 * reset-resolved-sla.cjs
 *
 * One-time cleanup: strips retroactively-set SLA deadline fields and breach flags
 * from all already-resolved/closed tickets so they are excluded from the SLA
 * compliance calculation. Run once after deploying the SLA compliance fix.
 *
 * Usage (from backend-express/ directory):
 *   node scripts/reset-resolved-sla.cjs
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

const TERMINAL_STATUSES = ['Resolved', 'Closed', 'Verified', 'Cancelled'];

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('ERROR: MONGODB_URI not found in .env');
        process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    const client = new MongoClient(uri);
    await client.connect();
    console.log('Connected.\n');

    // Use the database from the URI (works for both Atlas and local)
    const db = client.db();
    const tickets = db.collection('tickets');

    // ── Count scope ──────────────────────────────────────────────────────────
    const totalTerminal = await tickets.countDocuments({ status: { $in: TERMINAL_STATUSES } });
    const withSLA = await tickets.countDocuments({
        status: { $in: TERMINAL_STATUSES },
        slaRestoreDue: { $exists: true, $ne: null }
    });
    const flagged = await tickets.countDocuments({
        status: { $in: TERMINAL_STATUSES },
        isSLARestoreBreached: true
    });

    console.log(`Total resolved/closed/verified/cancelled tickets : ${totalTerminal}`);
    console.log(`  - with slaRestoreDue set (retro-fix affected)  : ${withSLA}`);
    console.log(`  - currently flagged isSLARestoreBreached=true  : ${flagged}`);
    console.log('');

    if (withSLA === 0) {
        console.log('Nothing to clean up. Exiting.');
        await client.close();
        process.exit(0);
    }

    // ── Strip SLA fields from all already-closed/resolved tickets ────────────
    const result = await tickets.updateMany(
        {
            status: { $in: TERMINAL_STATUSES },
            slaRestoreDue: { $exists: true, $ne: null }
        },
        {
            $unset: {
                slaRestoreDue: '',
                slaResponseDue: ''
            },
            $set: {
                isSLARestoreBreached: false,
                isSLAResponseBreached: false,
                isBreachWarningSent: false,
                slaWarning1hSent: false,
                isSlaBreachedNotificationSent: false
            }
        }
    );

    console.log(`Cleared SLA data from ${result.modifiedCount} tickets.\n`);

    // ── Verify ───────────────────────────────────────────────────────────────
    const remaining = await tickets.countDocuments({
        status: { $in: TERMINAL_STATUSES },
        slaRestoreDue: { $exists: true, $ne: null }
    });
    const remainingFlagged = await tickets.countDocuments({
        status: { $in: TERMINAL_STATUSES },
        isSLARestoreBreached: true
    });

    console.log('Verification:');
    console.log(`  - Still with slaRestoreDue set  : ${remaining}  (expected 0)`);
    console.log(`  - Still flagged as breached     : ${remainingFlagged}  (expected 0)`);

    if (remaining === 0 && remainingFlagged === 0) {
        console.log('\n✅ Done. SLA compliance will calculate from scratch going forward.');
        console.log('   Dashboard will show no % until the first new ticket is resolved.');
    } else {
        console.warn('\n⚠️  Some records were not cleaned - check manually.');
    }

    await client.close();
    process.exit(0);
}

run().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
