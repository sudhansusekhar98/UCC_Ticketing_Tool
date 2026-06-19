import mongoose from 'mongoose';
import DeviceInstallation from './models/DeviceInstallation.model.js';
import Project from './models/Project.model.js';
import Asset from './models/Asset.model.js';

async function test() {
  await mongoose.connect('mongodb://localhost:27017/ucc_ticketing');
  
  const count = await DeviceInstallation.countDocuments();
  console.log('Total devices:', count);
  const devices = await DeviceInstallation.find({ status: { $in: ['Configured', 'Tested', 'Deployed'] } }).sort({ updatedAt: -1 }).limit(3);
  for (const d of devices) {
     const p = await Project.findById(d.projectId);
     console.log('Device:', d._id, 'Status:', d.status, 'Project:', p ? p._id : 'null');
     console.log('Project siteAddress:', p ? p.siteAddress : '');
     console.log('LinkedSiteId:', p ? p.linkedSiteId : '');
     console.log('Converted to asset?', d.convertedToAsset);
     const a = await Asset.findOne({ remarks: { $regex: d._id.toString() } });
     console.log('Asset found?', a ? 'YES' : 'NO', a ? a._id : '');
  }
  process.exit(0);
}
test().catch(console.error);