/**
 * SCRIPT: Fix SLA Breached Flags & Recalculate SLA Targets
 * --------------------------------------------------------
 * Fixes existing tickets where:
 *   1. isSLAResponseBreached was polluted by the old At Risk cron job.
 *   2. OnHold or active RMA tickets were marked as breached.
 *   3. Closed / Resolved / Verified tickets were solved within SLA (resolvedOn <= slaRestoreDue)
 *      but are marked as isSLARestoreBreached = true.
 *   4. Tickets with custom site-level SLA policies that need accurate due dates.
 *
 * Usage:
 *   node scripts/fix-sla-breached-flags.js --dry-run
 *   node scripts/fix-sla-breached-flags.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Ticket from '../models/Ticket.model.js';
import Site from '../models/Site.model.js';
import SLAPolicy from '../models/SLAPolicy.model.js';
import { resolveSlaPolicy } from '../utils/sla.utils.js';

const isDryRun = process.argv.includes('--dry-run');

console.log(`\n🔧 SLA Breached Flags & Targets Fix`);
console.log(`   Mode: ${isDryRun ? '🟡 DRY RUN (no writes)' : '🔴 LIVE (writes to DB)'}\n`);

await mongoose.connect(process.env.MONGODB_URI);
console.log('✅ Connected to MongoDB\n');

let totalChecked = 0;
let fixedResponseBreached = 0;
let fixedOnHoldOrRma = 0;
let fixedResolvedWithinSla = 0;
let updatedSlaTargets = 0;

// ─── 1. Reset isSLAResponseBreached on active tickets (corrupted by old At Risk cron) ───
console.log('─── Step 1: Cleaning corrupted isSLAResponseBreached flags ───');
const corruptedResponseTickets = await Ticket.find({
  status: { $nin: ['Closed', 'Cancelled'] },
  isSLAResponseBreached: true
});

console.log(`Found ${corruptedResponseTickets.length} ticket(s) with isSLAResponseBreached = true`);
for (const t of corruptedResponseTickets) {
  totalChecked++;
  console.log(`  Ticket ${t.ticketNumber} (${t.status}): clearing isSLAResponseBreached`);
  if (!isDryRun) {
    t.isSLAResponseBreached = false;
    await t.save();
  }
  fixedResponseBreached++;
}

// ─── 2. Reset breach flags on OnHold and Active RMA tickets ───
console.log('\n─── Step 2: Fixing OnHold and Active RMA tickets ───');
const onHoldOrRmaTickets = await Ticket.find({
  $or: [
    { status: 'OnHold', isSLARestoreBreached: true },
    { rmaId: { $exists: true, $ne: null }, rmaFinalized: { $ne: true }, isSLARestoreBreached: true },
    { rmaNumber: { $exists: true, $ne: null, $ne: '' }, rmaFinalized: { $ne: true }, isSLARestoreBreached: true }
  ]
});

console.log(`Found ${onHoldOrRmaTickets.length} OnHold/RMA ticket(s) falsely marked as breached`);
for (const t of onHoldOrRmaTickets) {
  totalChecked++;
  console.log(`  Ticket ${t.ticketNumber} (${t.status}, RMA: ${t.rmaNumber || 'N/A'}): unmarking breach`);
  if (!isDryRun) {
    t.isSLARestoreBreached = false;
    t.isSlaBreachedNotificationSent = false;
    await t.save();
  }
  fixedOnHoldOrRma++;
}

// ─── 3. Fix Resolved/Closed/Verified tickets resolved within SLA ───
console.log('\n─── Step 3: Checking Resolved/Closed tickets marked breached ───');
const resolvedBreachedTickets = await Ticket.find({
  status: { $in: ['Resolved', 'Verified', 'Closed', 'Installed', 'Repaired', 'Replaced'] },
  isSLARestoreBreached: true
});

console.log(`Found ${resolvedBreachedTickets.length} resolved/closed ticket(s) currently marked breached`);
for (const t of resolvedBreachedTickets) {
  totalChecked++;
  const resolutionDate = t.resolvedOn || t.closedOn || t.updatedAt;
  const slaDeadline = t.slaRestoreDue ? new Date(t.slaRestoreDue) : null;

  if (resolutionDate && slaDeadline) {
    // If resolution date was before or at the SLA deadline, it was NOT breached!
    if (new Date(resolutionDate) <= slaDeadline) {
      console.log(`  Ticket ${t.ticketNumber}: Resolved at ${new Date(resolutionDate).toISOString()} <= SLA ${slaDeadline.toISOString()} -> Marking as NOT Breached ✅`);
      if (!isDryRun) {
        t.isSLARestoreBreached = false;
        t.isSlaBreachedNotificationSent = false;
        await t.save();
      }
      fixedResolvedWithinSla++;
    } else {
      console.log(`  Ticket ${t.ticketNumber}: Truly breached (Resolved ${new Date(resolutionDate).toISOString()} > SLA ${slaDeadline.toISOString()})`);
    }
  }
}

// ─── 4. Recalculate SLA targets for tickets with Site-level SLA overrides ───
console.log('\n─── Step 4: Verifying Site-level SLA targets on active tickets ───');
const activeTickets = await Ticket.find({
  status: { $nin: ['Closed', 'Cancelled', 'Resolved', 'Verified'] },
  siteId: { $exists: true, $ne: null }
});

for (const t of activeTickets) {
  totalChecked++;
  try {
    const policy = await resolveSlaPolicy(t.priority, t.siteId);
    const baseDate = t.createdAt || new Date();
    const expectedRestoreDue = new Date(baseDate.getTime() + policy.restoreTimeMinutes * 60 * 1000 + (t.totalHoldDurationMs || 0));

    // If difference is more than 5 minutes, sync it
    if (t.slaRestoreDue && Math.abs(new Date(t.slaRestoreDue).getTime() - expectedRestoreDue.getTime()) > 5 * 60 * 1000) {
      console.log(`  Ticket ${t.ticketNumber} (${t.priority}): SLA restore due adjusted from ${new Date(t.slaRestoreDue).toISOString()} to ${expectedRestoreDue.toISOString()} (${policy.restoreTimeMinutes}m policy)`);
      if (!isDryRun) {
        t.slaRestoreDue = expectedRestoreDue;
        t.slaResponseDue = new Date(baseDate.getTime() + policy.responseTimeMinutes * 60 * 1000);
        // If the new due date is in the future, clear breach flags
        if (expectedRestoreDue > new Date()) {
          t.isSLARestoreBreached = false;
          t.isSlaBreachedNotificationSent = false;
        }
        await t.save();
      }
      updatedSlaTargets++;
    }
  } catch (err) {
    console.error(`  Error checking ticket ${t.ticketNumber}:`, err.message);
  }
}

console.log('\n════════════════════════════════════════════════════════');
console.log(`  Total tickets checked           : ${totalChecked}`);
console.log(`  Cleaned isSLAResponseBreached   : ${fixedResponseBreached}`);
console.log(`  Fixed OnHold / RMA tickets      : ${fixedOnHoldOrRma}`);
console.log(`  Fixed falsely breached resolved : ${fixedResolvedWithinSla}`);
console.log(`  Adjusted Site-level SLA targets : ${updatedSlaTargets}`);
if (isDryRun) {
  console.log('\n  🟡 DRY RUN — no data was modified.');
  console.log('  Run without --dry-run to apply changes.');
}
console.log('════════════════════════════════════════════════════════\n');

await mongoose.disconnect();
