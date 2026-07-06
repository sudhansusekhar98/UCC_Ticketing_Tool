/**
 * reset-resolved-sla.js
 *
 * One-time cleanup script.
 *
 * Problem: The fix-sla-data.js script retroactively set slaRestoreDue = createdAt + SLA_duration
 * on ALL tickets, including ones already Resolved/Closed. Those deadlines are weeks in the past,
 * so every resolved ticket has isSLARestoreBreached = true, causing 0% SLA compliance.
 *
 * Fix: Strip SLA deadline and breach flags from all already-closed/resolved/verified tickets so
 * they are excluded from the compliance denominator entirely. These tickets pre-date the working
 * SLA system and should not skew the compliance metric.
 *
 * Usage (from backend-express/ directory):
 *   node scripts/reset-resolved-sla.js
 *
 * Safe to re-run - uses $unset / $set with explicit conditions.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const TERMINAL_STATUSES = ['Resolved', 'Closed', 'Verified', 'Cancelled'];

const run = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.\n');

        const db = mongoose.connection.db;
        const tickets = db.collection('tickets');

        // ── Step 1: Count scope ──────────────────────────────────────────────────
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
        console.log(`  - with slaRestoreDue set (affected by retro fix) : ${withSLA}`);
        console.log(`  - currently flagged isSLARestoreBreached = true  : ${flagged}`);
        console.log('');

        if (withSLA === 0) {
            console.log('Nothing to clean up. Exiting.');
            process.exit(0);
        }

        // ── Step 2: Strip SLA deadline fields ───────────────────────────────────
        // These tickets pre-date the working SLA system. Removing slaRestoreDue
        // excludes them from the compliance denominator (totalClosedWithSLA).
        const unsetResult = await tickets.updateMany(
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

        console.log(`Cleared SLA deadline fields from ${unsetResult.modifiedCount} tickets.`);

        // ── Step 3: Verify ───────────────────────────────────────────────────────
        const remaining = await tickets.countDocuments({
            status: { $in: TERMINAL_STATUSES },
            slaRestoreDue: { $exists: true, $ne: null }
        });
        const remainingFlagged = await tickets.countDocuments({
            status: { $in: TERMINAL_STATUSES },
            isSLARestoreBreached: true
        });

        console.log(`\nPost-cleanup verification:`);
        console.log(`  - Resolved/closed tickets still with slaRestoreDue : ${remaining}  (expected 0)`);
        console.log(`  - Resolved/closed tickets still flagged as breached : ${remainingFlagged}  (expected 0)`);

        if (remaining === 0 && remainingFlagged === 0) {
            console.log('\n✅ Cleanup complete. SLA compliance will now calculate from scratch.');
            console.log('   The dashboard will show "N/A" (no data) until new tickets are resolved.');
            console.log('   As new tickets are resolved within their SLA, the % will build up correctly.');
        } else {
            console.warn('\n⚠️  Some records were not cleaned - check manually.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

run();
