// ponytail: one-off data fix for RMAs auto-approved before createRMA initialized track statuses.
// Run once: node scripts/fix-stuck-approved-rma.js
import 'dotenv/config';
import mongoose from 'mongoose';
import RMARequest from '../models/RMARequest.model.js';

await mongoose.connect(process.env.MONGODB_URI);

const stuck = await RMARequest.find({ status: 'Approved', repairTrackStatus: null });
console.log(`Found ${stuck.length} stuck RMA(s).`);

for (const rma of stuck) {
  rma.repairTrackStatus = 'Pending';
  if (rma.replacementSource === 'RepairAndReplace') {
    if (rma.reservedAssetId) {
      rma.replacementTrackStatus = 'Received';
      rma.replacementStockSource = rma.replacementStockSource || 'SiteStock';
    } else {
      rma.replacementTrackStatus = 'Pending';
    }
  } else {
    rma.replacementTrackStatus = 'NotRequired';
  }
  await rma.save();
  console.log(`Fixed RMA ${rma.rmaNumber}`);
}

await mongoose.disconnect();
