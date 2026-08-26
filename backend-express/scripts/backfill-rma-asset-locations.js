/**
 * BACKFILL: RMA Asset Location Sync
 * ------------------------------------
 * Fixes existing RMA records where the asset's siteId / status / stockLocation
 * was never updated because they were processed before the auto-movement logic.
 *
 * Handles these "stuck" states:
 *   ReceivedAtHO        → asset should be at HO stock (Spare)
 *   SentForRepairFromHO → asset should be In Repair at HO (stockLocation: "With Service Center")
 *   ItemRepairedAtHO    → asset should be Spare at HO
 *   ReturnShippedToSite → asset should be InTransit toward site
 *
 * Run (DRY RUN first):
 *   node scripts/backfill-rma-asset-locations.js --dry-run
 *
 * Then run for real:
 *   node scripts/backfill-rma-asset-locations.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import RMARequest from '../models/RMARequest.model.js';
import Asset from '../models/Asset.model.js';
import Site from '../models/Site.model.js';
import StockMovementLog from '../models/StockMovementLog.model.js';
import User from '../models/User.model.js';

const isDryRun = process.argv.includes('--dry-run');

console.log(`\n🔧 RMA Asset Location Backfill`);
console.log(`   Mode: ${isDryRun ? '🟡 DRY RUN (no writes)' : '🔴 LIVE (writes to DB)'}\n`);

// ─── Connect ──────────────────────────────────────────────────────────────────
await mongoose.connect(process.env.MONGODB_URI);
console.log('✅ Connected to MongoDB\n');

// ─── Find HO Site ─────────────────────────────────────────────────────────────
const hoSite = await Site.findOne({ isHeadOffice: true });
if (!hoSite) {
  console.error('❌ FATAL: No site found with isHeadOffice: true. Cannot proceed.');
  await mongoose.disconnect();
  process.exit(1);
}
console.log(`🏢 HO Site: ${hoSite.siteName} (${hoSite._id})`);

// ─── Find System Admin (used as performedBy in log entries) ───────────────────
const systemAdmin = await User.findOne({ role: 'Admin', isActive: true }).select('_id fullName');
if (!systemAdmin) {
  console.error('❌ FATAL: No active Admin user found. Cannot create stock movement logs.');
  await mongoose.disconnect();
  process.exit(1);
}
console.log(`👤 System actor: ${systemAdmin.fullName} (${systemAdmin._id})\n`);
const SYSTEM_ACTOR_ID = systemAdmin._id;

// ─── Counters ─────────────────────────────────────────────────────────────────
let total = 0;
let fixed = 0;
let skipped = 0;
const issues = [];

// Helper: log + conditionally write
const applyFix = async (asset, updates, logEntry, rmaNumber, phase) => {
  const before = {
    siteId: asset.siteId?.toString(),
    status: asset.status,
    stockLocation: asset.stockLocation
  };

  console.log(`  📦 Asset ${asset.assetCode || asset._id} | Phase: ${phase}`);
  console.log(`     Before → siteId: ${before.siteId}, status: ${before.status}, stockLocation: ${before.stockLocation}`);
  console.log(`     After  → siteId: ${updates.siteId || before.siteId}, status: ${updates.status}, stockLocation: ${updates.stockLocation}`);

  if (!isDryRun) {
    Object.assign(asset, updates);
    await asset.save();

    try {
      await StockMovementLog.logMovement({
        asset,
        ...logEntry,
        performedBy: SYSTEM_ACTOR_ID,
        notes: `[BACKFILL] ${logEntry.notes}`
      });
    } catch (logErr) {
      console.warn(`     ⚠️  Asset saved but log failed: ${logErr.message}`);
    }

    console.log(`     ✅ Fixed`);
  } else {
    console.log(`     🟡 Skipped (dry run)`);
  }
  console.log('');
};

// ─── Phase 1: ReceivedAtHO ────────────────────────────────────────────────────
// Asset should be: Spare, siteId = HO, stockLocation = "HO Stock (RMA Received)"
{
  const rmas = await RMARequest.find({
    status: 'ReceivedAtHO',
    repairTrackStatus: 'ReceivedAtHO'
  }).lean();

  console.log(`─── Phase 1: ReceivedAtHO (${rmas.length} RMAs) ───`);
  total += rmas.length;

  for (const rma of rmas) {
    const asset = await Asset.findById(rma.originalAssetId);
    if (!asset) {
      console.warn(`  ⚠️  RMA ${rma.rmaNumber} — asset not found (${rma.originalAssetId})`);
      skipped++;
      continue;
    }

    // Already at HO? Skip
    if (asset.siteId?.toString() === hoSite._id.toString() && asset.status === 'Spare') {
      console.log(`  ✔️  RMA ${rma.rmaNumber} — already correct, skip\n`);
      skipped++;
      continue;
    }

    const fromSiteId = asset.siteId;
    await applyFix(
      asset,
      {
        status: 'Spare',
        siteId: hoSite._id,
        stockLocation: 'HO Stock (RMA Received)',
        locationDescription: `RMA ${rma.rmaNumber} - Backfill: Faulty item received at HO`
      },
      {
        movementType: 'Transfer',
        fromSiteId,
        toSiteId: hoSite._id,
        fromStatus: asset.status,
        toStatus: 'Spare',
        rmaId: rma._id,
        ticketId: rma.ticketId,
        notes: `RMA ${rma.rmaNumber} - Faulty item received at HO and added to HO stock`
      },
      rma.rmaNumber,
      'ReceivedAtHO'
    );
    fixed++;
  }
}

// ─── Phase 2: SentForRepairFromHO ────────────────────────────────────────────
// Asset should be: In Repair, siteId = HO, stockLocation = "With Service Center"
{
  const rmas = await RMARequest.find({
    status: 'SentForRepairFromHO',
    repairTrackStatus: 'SentForRepair'
  }).lean();

  console.log(`─── Phase 2: SentForRepairFromHO (${rmas.length} RMAs) ───`);
  total += rmas.length;

  for (const rma of rmas) {
    const asset = await Asset.findById(rma.originalAssetId);
    if (!asset) {
      console.warn(`  ⚠️  RMA ${rma.rmaNumber} — asset not found (${rma.originalAssetId})`);
      skipped++;
      continue;
    }

    // Already correct?
    if (
      asset.siteId?.toString() === hoSite._id.toString() &&
      asset.status === 'In Repair' &&
      asset.stockLocation === 'With Service Center'
    ) {
      console.log(`  ✔️  RMA ${rma.rmaNumber} — already correct, skip\n`);
      skipped++;
      continue;
    }

    const fromSiteId = asset.siteId;
    await applyFix(
      asset,
      {
        status: 'In Repair',
        siteId: hoSite._id,
        stockLocation: 'With Service Center',
        locationDescription: `RMA ${rma.rmaNumber} - Backfill: Sent from HO to service center`
      },
      {
        movementType: 'Transfer',
        fromSiteId,
        toSiteId: hoSite._id,
        fromStatus: asset.status,
        toStatus: 'In Repair',
        rmaId: rma._id,
        ticketId: rma.ticketId,
        notes: `RMA ${rma.rmaNumber} - Item sent from HO to service center for repair`
      },
      rma.rmaNumber,
      'SentForRepairFromHO'
    );
    fixed++;
  }
}

// ─── Phase 3: ItemRepairedAtHO ────────────────────────────────────────────────
// Asset should be: Spare, siteId = HO, stockLocation = "HO Stock (Repaired)"
{
  const rmas = await RMARequest.find({
    status: 'ItemRepairedAtHO',
    repairTrackStatus: 'Repaired'
  }).lean();

  console.log(`─── Phase 3: ItemRepairedAtHO (${rmas.length} RMAs) ───`);
  total += rmas.length;

  for (const rma of rmas) {
    // Use the faulty asset (may be reservedAssetId if swap happened)
    const faultyAssetId = (rma.reservedAssetId && rma.replacementTrackStatus === 'Installed')
      ? rma.reservedAssetId
      : rma.originalAssetId;

    const asset = await Asset.findById(faultyAssetId);
    if (!asset) {
      console.warn(`  ⚠️  RMA ${rma.rmaNumber} — asset not found (${faultyAssetId})`);
      skipped++;
      continue;
    }

    if (
      asset.siteId?.toString() === hoSite._id.toString() &&
      asset.status === 'Spare' &&
      asset.stockLocation === 'HO Stock (Repaired)'
    ) {
      console.log(`  ✔️  RMA ${rma.rmaNumber} — already correct, skip\n`);
      skipped++;
      continue;
    }

    const fromSiteId = asset.siteId;
    await applyFix(
      asset,
      {
        status: 'Spare',
        siteId: hoSite._id,
        stockLocation: 'HO Stock (Repaired)',
        locationDescription: `RMA ${rma.rmaNumber} - Backfill: Repaired item back at HO`
      },
      {
        movementType: 'Transfer',
        fromSiteId,
        toSiteId: hoSite._id,
        fromStatus: asset.status,
        toStatus: 'Spare',
        rmaId: rma._id,
        ticketId: rma.ticketId,
        notes: `RMA ${rma.rmaNumber} - Repaired item received back from service center, added to HO stock`
      },
      rma.rmaNumber,
      'ItemRepairedAtHO'
    );
    fixed++;
  }
}

// ─── Phase 4: ReturnShippedToSite (BackToSite / OtherSite) ───────────────────
// Asset should be: InTransit toward destination site
{
  const rmas = await RMARequest.find({
    status: 'ReturnShippedToSite',
    repairTrackStatus: 'ReturnShipped',
    // Only target BackToSite / OtherSite — HOStock path already moved the asset correctly
    repairedItemDestination: { $in: ['BackToSite', 'OtherSite', 'None', null] }
  }).lean();

  console.log(`─── Phase 4: ReturnShippedToSite / BackToSite (${rmas.length} RMAs) ───`);
  total += rmas.length;

  for (const rma of rmas) {
    const faultyAssetId = (rma.reservedAssetId && rma.replacementTrackStatus === 'Installed')
      ? rma.reservedAssetId
      : rma.originalAssetId;

    const asset = await Asset.findById(faultyAssetId);
    if (!asset) {
      console.warn(`  ⚠️  RMA ${rma.rmaNumber} — asset not found (${faultyAssetId})`);
      skipped++;
      continue;
    }

    if (asset.status === 'InTransit' && asset.stockLocation === 'In Transit to Site') {
      console.log(`  ✔️  RMA ${rma.rmaNumber} — already correct, skip\n`);
      skipped++;
      continue;
    }

    const destSiteId = rma.overrideDestinationSiteId || rma.siteId;
    const fromSiteId = asset.siteId;
    await applyFix(
      asset,
      {
        status: 'InTransit',
        stockLocation: 'In Transit to Site',
        locationDescription: `RMA ${rma.rmaNumber} - Backfill: Repaired item dispatched from HO to site`
      },
      {
        movementType: 'Transfer',
        fromSiteId,
        toSiteId: destSiteId,
        fromStatus: asset.status,
        toStatus: 'InTransit',
        rmaId: rma._id,
        ticketId: rma.ticketId,
        notes: `RMA ${rma.rmaNumber} - Repaired item dispatched from HO to ${rma.repairedItemDestination === 'OtherSite' ? 'alternate site' : 'site'}`
      },
      rma.rmaNumber,
      'ReturnShippedToSite'
    );
    fixed++;
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════');
console.log(`  Total RMAs checked : ${total}`);
console.log(`  Fixed              : ${fixed}`);
console.log(`  Skipped (already OK): ${skipped}`);
if (isDryRun) {
  console.log('\n  🟡 DRY RUN — no data was modified.');
  console.log('  Run without --dry-run to apply changes.');
}
console.log('════════════════════════════════════════\n');

await mongoose.disconnect();
