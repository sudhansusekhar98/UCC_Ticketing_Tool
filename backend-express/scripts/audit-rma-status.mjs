import mongoose from 'mongoose';
import dotenv from 'dotenv';
import RMARequest from '../models/RMARequest.model.js';
import Asset from '../models/Asset.model.js';

dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected.\n');

// 1. Status distribution
const pipeline = [
  { $group: { _id: { status: '$status', repairTrack: '$repairTrackStatus' }, count: { $sum: 1 } } },
  { $sort: { '_id.status': 1 } }
];
const results = await RMARequest.aggregate(pipeline);
console.log('RMA Status Distribution:');
console.log('Status                   | repairTrackStatus      | count');
console.log('─'.repeat(65));
for (const r of results) {
  const s = (r._id.status || 'null').padEnd(24);
  const t = (r._id.repairTrack || 'null').padEnd(22);
  console.log(`${s} | ${t} | ${r.count}`);
}

// 2. All in-progress RMAs that used the HO route
const hoRouteRmas = await RMARequest.find({
  itemSendRoute: 'ToHO',
  status: { $nin: ['Installed', 'Rejected'] }
}).select('rmaNumber status repairTrackStatus originalAssetId itemSendRoute').lean();

console.log(`\n\nIn-Progress HO-Route RMAs (itemSendRoute=ToHO): ${hoRouteRmas.length}`);
console.log('RMANumber   | status                  | repairTrackStatus');
console.log('─'.repeat(65));
for (const r of hoRouteRmas) {
  const num = (r.rmaNumber || 'N/A').padEnd(11);
  const s = (r.status || 'null').padEnd(24);
  const t = r.repairTrackStatus || 'null';
  console.log(`${num} | ${s} | ${t}`);

  const asset = await Asset.findById(r.originalAssetId)
    .select('status siteId stockLocation locationDescription').lean();
  if (asset) {
    console.log(`            └─ status=${asset.status} | stockLocation=${asset.stockLocation || 'none'}`);
  }
}

await mongoose.disconnect();
