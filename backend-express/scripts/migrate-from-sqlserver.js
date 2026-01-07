/**
 * Migration Script: SQL Server → MongoDB
 * 
 * This script migrates all data from the existing UCCTicketing SQL Server database
 * to the new MongoDB database.
 * 
 * Usage: npm run migrate
 */

import mongoose from 'mongoose';
import sql from 'mssql';
import dotenv from 'dotenv';
import { hashPassword } from '../utils/auth.utils.js';

// Import all models
import User from '../models/User.model.js';
import Site from '../models/Site.model.js';
import Asset from '../models/Asset.model.js';
import Ticket from '../models/Ticket.model.js';
import SLAPolicy from '../models/SLAPolicy.model.js';
import TicketActivity from '../models/TicketActivity.model.js';
import TicketAttachment from '../models/TicketAttachment.model.js';
import WorkOrder from '../models/WorkOrder.model.js';

dotenv.config();

// SQL Server configuration
const sqlConfig = {
  server: 'localhost',
  database: 'UCCTicketing',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  authentication: {
    type: 'default',
    options: {
      trustedConnection: true
    }
  },
  // Windows Authentication
  driver: 'msnodesqlv8'
};

// Alternative config for SQL Authentication
const sqlConfigWithAuth = {
  server: 'localhost',
  database: 'UCCTicketing',
  user: 'sa', // Change if using SQL auth
  password: '', // Change if using SQL auth
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

// ID mapping - SQL Server IDs to MongoDB ObjectIds
const idMaps = {
  users: new Map(),
  sites: new Map(),
  assets: new Map(),
  tickets: new Map(),
  slaPolicies: new Map(),
  activities: new Map(),
  workOrders: new Map()
};

// Statistics
const stats = {
  users: { total: 0, migrated: 0, errors: 0 },
  sites: { total: 0, migrated: 0, errors: 0 },
  assets: { total: 0, migrated: 0, errors: 0 },
  slaPolicies: { total: 0, migrated: 0, errors: 0 },
  tickets: { total: 0, migrated: 0, errors: 0 },
  activities: { total: 0, migrated: 0, errors: 0 },
  attachments: { total: 0, migrated: 0, errors: 0 },
  workOrders: { total: 0, migrated: 0, errors: 0 }
};

async function connectSQL() {
  try {
    // Try Windows Authentication first
    console.log('🔌 Connecting to SQL Server (Windows Auth)...');
    
    // For Windows Authentication, we need msnodesqlv8 driver
    const pool = await sql.connect(
      `Server=localhost;Database=UCCTicketing;Trusted_Connection=Yes;Driver={ODBC Driver 17 for SQL Server}`
    );
    
    console.log('✅ Connected to SQL Server');
    return pool;
  } catch (error) {
    console.error('❌ SQL Server connection error:', error.message);
    console.log('\n📋 Troubleshooting:');
    console.log('1. Make sure SQL Server is running');
    console.log('2. Check if the database "UCCTicketing" exists');
    console.log('3. Install ODBC Driver 17 for SQL Server if not installed');
    throw error;
  }
}

async function connectMongoDB() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
}

// ============ MIGRATION FUNCTIONS ============

async function migrateSLAPolicies(pool) {
  console.log('\n📋 Migrating SLA Policies...');
  
  try {
    const result = await pool.request().query(`
      SELECT * FROM SLAPolicies ORDER BY PolicyId
    `);
    
    stats.slaPolicies.total = result.recordset.length;
    
    for (const row of result.recordset) {
      try {
        const policy = await SLAPolicy.create({
          policyName: row.PolicyName,
          priority: row.Priority,
          responseTimeMinutes: row.ResponseTimeMinutes,
          restoreTimeMinutes: row.RestoreTimeMinutes,
          escalationLevel1Minutes: row.EscalationLevel1Minutes,
          escalationLevel2Minutes: row.EscalationLevel2Minutes,
          escalationL1Emails: row.EscalationL1Emails,
          escalationL2Emails: row.EscalationL2Emails,
          isActive: row.IsActive,
          createdAt: row.CreatedOn,
          updatedAt: row.ModifiedOn || row.CreatedOn
        });
        
        idMaps.slaPolicies.set(row.PolicyId, policy._id);
        stats.slaPolicies.migrated++;
        console.log(`  ✓ SLA Policy: ${row.PolicyName}`);
      } catch (err) {
        stats.slaPolicies.errors++;
        console.error(`  ✗ Error migrating SLA Policy ${row.PolicyId}:`, err.message);
      }
    }
    
    console.log(` SLA Policies: ${stats.slaPolicies.migrated}/${stats.slaPolicies.total} migrated`);
  } catch (error) {
    console.error(' Error fetching SLA Policies:', error.message);
  }
}

async function migrateSites(pool) {
  console.log('\n📋 Migrating Sites...');
  
  try {
    const result = await pool.request().query(`
      SELECT * FROM SiteMasters ORDER BY SiteId
    `);
    
    stats.sites.total = result.recordset.length;
    
    for (const row of result.recordset) {
      try {
        const site = await Site.create({
          siteName: row.SiteName,
          siteUniqueID: row.SiteUniqueID,
          city: row.City,
          zone: row.Zone,
          ward: row.Ward,
          address: row.Address,
          latitude: row.Latitude,
          longitude: row.Longitude,
          contactPerson: row.ContactPerson,
          contactPhone: row.ContactPhone,
          isActive: row.IsActive,
          createdAt: row.CreatedOn,
          updatedAt: row.ModifiedOn || row.CreatedOn
        });
        
        idMaps.sites.set(row.SiteId, site._id);
        stats.sites.migrated++;
        console.log(`  ✓ Site: ${row.SiteName}`);
      } catch (err) {
        stats.sites.errors++;
        console.error(`  ✗ Error migrating Site ${row.SiteId}:`, err.message);
      }
    }
    
    console.log(` Sites: ${stats.sites.migrated}/${stats.sites.total} migrated`);
  } catch (error) {
    console.error(' Error fetching Sites:', error.message);
  }
}

async function migrateUsers(pool) {
  console.log('\n Migrating Users...');
  
  try {
    const result = await pool.request().query(`
      SELECT * FROM UserMasters ORDER BY UserId
    `);
    
    stats.users.total = result.recordset.length;
    
    for (const row of result.recordset) {
      try {
        // Check if user already exists (by email or username)
        const existingUser = await User.findOne({
          $or: [{ email: row.Email }, { username: row.Username }]
        });
        
        if (existingUser) {
          idMaps.users.set(row.UserId, existingUser._id);
          stats.users.migrated++;
          console.log(`  ⚠ User exists, mapped: ${row.Username}`);
          continue;
        }
        
        const user = await User.create({
          fullName: row.FullName,
          email: row.Email,
          username: row.Username,
          passwordHash: row.PasswordHash, // Keep existing hash
          role: row.Role,
          mobileNumber: row.MobileNumber,
          designation: row.Designation,
          siteId: row.SiteId ? idMaps.sites.get(row.SiteId) : null,
          isActive: row.IsActive,
          lastLoginOn: row.LastLoginOn,
          createdAt: row.CreatedOn
        });
        
        idMaps.users.set(row.UserId, user._id);
        stats.users.migrated++;
        console.log(`  ✓ User: ${row.Username}`);
      } catch (err) {
        stats.users.errors++;
        console.error(`  ✗ Error migrating User ${row.UserId}:`, err.message);
      }
    }
    
    console.log(` Users: ${stats.users.migrated}/${stats.users.total} migrated`);
  } catch (error) {
    console.error(' Error fetching Users:', error.message);
  }
}

async function migrateAssets(pool) {
  console.log('\n📋 Migrating Assets...');
  
  try {
    const result = await pool.request().query(`
      SELECT * FROM AssetMasters ORDER BY AssetId
    `);
    
    stats.assets.total = result.recordset.length;
    
    for (const row of result.recordset) {
      try {
        const asset = await Asset.create({
          assetCode: row.AssetCode,
          assetType: row.AssetType,
          serialNumber: row.SerialNumber,
          mac: row.MAC,
          siteId: idMaps.sites.get(row.SiteId),
          locationDescription: row.LocationDescription,
          criticality: row.Criticality,
          status: row.Status,
          installationDate: row.InstallationDate,
          warrantyEndDate: row.WarrantyEndDate,
          vmsReferenceId: row.VmsReferenceId,
          nmsReferenceId: row.NmsReferenceId,
          make: row.Make,
          model: row.Model,
          managementIP: row.ManagementIP,
          locationName: row.LocationName,
          deviceType: row.DeviceType,
          usedFor: row.UsedFor,
          userName: row.UserName,
          password: row.Password,
          remark: row.Remark,
          isActive: row.IsActive,
          createdAt: row.CreatedOn,
          updatedAt: row.ModifiedOn || row.CreatedOn
        });
        
        idMaps.assets.set(row.AssetId, asset._id);
        stats.assets.migrated++;
        console.log(`  ✓ Asset: ${row.AssetCode}`);
      } catch (err) {
        stats.assets.errors++;
        console.error(`  ✗ Error migrating Asset ${row.AssetId}:`, err.message);
      }
    }
    
    console.log(`✅ Assets: ${stats.assets.migrated}/${stats.assets.total} migrated`);
  } catch (error) {
    console.error('❌ Error fetching Assets:', error.message);
  }
}

async function migrateTickets(pool) {
  console.log('\n📋 Migrating Tickets...');
  
  try {
    const result = await pool.request().query(`
      SELECT * FROM TicketMasters ORDER BY TicketId
    `);
    
    stats.tickets.total = result.recordset.length;
    
    for (const row of result.recordset) {
      try {
        const ticket = await Ticket.create({
          ticketNumber: row.TicketNumber,
          assetId: row.AssetId ? idMaps.assets.get(row.AssetId) : null,
          category: row.Category,
          subCategory: row.SubCategory,
          title: row.Title,
          description: row.Description,
          priority: row.Priority,
          priorityScore: row.PriorityScore,
          impact: row.Impact,
          urgency: row.Urgency,
          status: row.Status,
          source: row.Source,
          createdBy: idMaps.users.get(row.CreatedBy),
          assignedTo: row.AssignedTo ? idMaps.users.get(row.AssignedTo) : null,
          slaPolicyId: row.SLAPolicyId ? idMaps.slaPolicies.get(row.SLAPolicyId) : null,
          assignedOn: row.AssignedOn,
          acknowledgedOn: row.AcknowledgedOn,
          resolvedOn: row.ResolvedOn,
          closedOn: row.ClosedOn,
          slaResponseDue: row.SLAResponseDue,
          slaRestoreDue: row.SLARestoreDue,
          isSLAResponseBreached: row.IsSLAResponseBreached,
          isSLARestoreBreached: row.IsSLARestoreBreached,
          escalationLevel: row.EscalationLevel,
          rootCause: row.RootCause,
          resolutionSummary: row.ResolutionSummary,
          verifiedBy: row.VerifiedBy,
          verifiedOn: row.VerifiedOn,
          requiresVerification: row.RequiresVerification,
          tags: row.Tags,
          createdAt: row.CreatedOn,
          updatedAt: row.ModifiedOn || row.CreatedOn
        });
        
        idMaps.tickets.set(row.TicketId, ticket._id);
        stats.tickets.migrated++;
        console.log(`  ✓ Ticket: ${row.TicketNumber}`);
      } catch (err) {
        stats.tickets.errors++;
        console.error(`  ✗ Error migrating Ticket ${row.TicketId}:`, err.message);
      }
    }
    
    console.log(`✅ Tickets: ${stats.tickets.migrated}/${stats.tickets.total} migrated`);
  } catch (error) {
    console.error('❌ Error fetching Tickets:', error.message);
  }
}

async function migrateTicketActivities(pool) {
  console.log('\n📋 Migrating Ticket Activities...');
  
  try {
    const result = await pool.request().query(`
      SELECT * FROM TicketActivities ORDER BY ActivityId
    `);
    
    stats.activities.total = result.recordset.length;
    
    for (const row of result.recordset) {
      try {
        const activity = await TicketActivity.create({
          ticketId: idMaps.tickets.get(row.TicketId),
          userId: idMaps.users.get(row.UserId),
          activityType: row.ActivityType,
          content: row.Content,
          isInternal: row.IsInternal,
          createdOn: row.CreatedOn
        });
        
        idMaps.activities.set(row.ActivityId, activity._id);
        stats.activities.migrated++;
      } catch (err) {
        stats.activities.errors++;
        console.error(`  ✗ Error migrating Activity ${row.ActivityId}:`, err.message);
      }
    }
    
    console.log(`✅ Activities: ${stats.activities.migrated}/${stats.activities.total} migrated`);
  } catch (error) {
    console.error('❌ Error fetching Activities:', error.message);
  }
}

async function migrateTicketAttachments(pool) {
  console.log('\n📋 Migrating Ticket Attachments...');
  
  try {
    const result = await pool.request().query(`
      SELECT * FROM TicketAttachments ORDER BY AttachmentId
    `);
    
    stats.attachments.total = result.recordset.length;
    
    for (const row of result.recordset) {
      try {
        await TicketAttachment.create({
          activityId: row.ActivityId ? idMaps.activities.get(row.ActivityId) : null,
          ticketId: row.TicketId ? idMaps.tickets.get(row.TicketId) : null,
          uploadedBy: idMaps.users.get(row.UploadedBy),
          fileName: row.FileName,
          contentType: row.ContentType,
          fileSize: row.FileSize,
          storageType: row.StorageType,
          filePath: row.FilePath,
          attachmentType: row.AttachmentType,
          description: row.Description,
          cloudinaryUrl: row.CloudinaryUrl,
          cloudinaryPublicId: row.CloudinaryPublicId,
          // Note: FileData (binary) is not migrated for now
          uploadedOn: row.UploadedOn
        });
        
        stats.attachments.migrated++;
      } catch (err) {
        stats.attachments.errors++;
        console.error(`  ✗ Error migrating Attachment ${row.AttachmentId}:`, err.message);
      }
    }
    
    console.log(`✅ Attachments: ${stats.attachments.migrated}/${stats.attachments.total} migrated`);
  } catch (error) {
    console.error('❌ Error fetching Attachments:', error.message);
  }
}

async function migrateWorkOrders(pool) {
  console.log('\n📋 Migrating Work Orders...');
  
  try {
    const result = await pool.request().query(`
      SELECT * FROM WorkOrders ORDER BY WorkOrderId
    `);
    
    stats.workOrders.total = result.recordset.length;
    
    for (const row of result.recordset) {
      try {
        const workOrder = await WorkOrder.create({
          workOrderNumber: row.WorkOrderNumber,
          ticketId: idMaps.tickets.get(row.TicketId),
          engineerId: idMaps.users.get(row.EngineerId),
          status: row.Status,
          workOrderType: row.WorkOrderType,
          checklistJson: row.ChecklistJson,
          partsUsedJson: row.PartsUsedJson,
          scheduledDate: row.ScheduledDate,
          startedOn: row.StartedOn,
          completedOn: row.CompletedOn,
          startLatitude: row.StartLatitude,
          startLongitude: row.StartLongitude,
          endLatitude: row.EndLatitude,
          endLongitude: row.EndLongitude,
          workPerformed: row.WorkPerformed,
          remarks: row.Remarks,
          observations: row.Observations,
          requiresApproval: row.RequiresApproval,
          approvedBy: row.ApprovedBy ? idMaps.users.get(row.ApprovedBy) : null,
          approvedOn: row.ApprovedOn,
          approvalRemarks: row.ApprovalRemarks,
          createdAt: row.CreatedOn,
          updatedAt: row.ModifiedOn || row.CreatedOn
        });
        
        idMaps.workOrders.set(row.WorkOrderId, workOrder._id);
        stats.workOrders.migrated++;
        console.log(`  ✓ Work Order: ${row.WorkOrderNumber}`);
      } catch (err) {
        stats.workOrders.errors++;
        console.error(`  ✗ Error migrating Work Order ${row.WorkOrderId}:`, err.message);
      }
    }
    
    console.log(`✅ Work Orders: ${stats.workOrders.migrated}/${stats.workOrders.total} migrated`);
  } catch (error) {
    console.error('❌ Error fetching Work Orders:', error.message);
  }
}

async function migrateSystemSettings(pool) {
  console.log('\n📋 Migrating System Settings...');
  
  try {
    const result = await pool.request().query(`
      SELECT * FROM SystemSettings
    `);
    
    if (result.recordset.length > 0) {
      // Create a settings collection if needed
      const settingsCollection = mongoose.connection.collection('systemsettings');
      
      for (const row of result.recordset) {
        await settingsCollection.updateOne(
          { key: row.SettingKey },
          {
            $set: {
              key: row.SettingKey,
              value: row.SettingValue,
              dataType: row.DataType,
              description: row.Description,
              category: row.Category,
              isEditable: row.IsEditable,
              updatedAt: row.ModifiedOn || new Date()
            }
          },
          { upsert: true }
        );
      }
      
      console.log(`✅ System Settings: ${result.recordset.length} migrated`);
    }
  } catch (error) {
    console.log('⚠ No System Settings table found or error:', error.message);
  }
}

async function printSummary() {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('═'.repeat(60));
  
  const categories = [
    { name: 'SLA Policies', stats: stats.slaPolicies },
    { name: 'Sites', stats: stats.sites },
    { name: 'Users', stats: stats.users },
    { name: 'Assets', stats: stats.assets },
    { name: 'Tickets', stats: stats.tickets },
    { name: 'Activities', stats: stats.activities },
    { name: 'Attachments', stats: stats.attachments },
    { name: 'Work Orders', stats: stats.workOrders }
  ];
  
  let totalMigrated = 0;
  let totalErrors = 0;
  let totalRecords = 0;
  
  for (const cat of categories) {
    const status = cat.stats.errors > 0 ? '⚠' : '✅';
    console.log(`${status} ${cat.name.padEnd(15)} | Total: ${String(cat.stats.total).padStart(5)} | Migrated: ${String(cat.stats.migrated).padStart(5)} | Errors: ${cat.stats.errors}`);
    totalMigrated += cat.stats.migrated;
    totalErrors += cat.stats.errors;
    totalRecords += cat.stats.total;
  }
  
  console.log('─'.repeat(60));
  console.log(`📈 TOTAL           | Total: ${String(totalRecords).padStart(5)} | Migrated: ${String(totalMigrated).padStart(5)} | Errors: ${totalErrors}`);
  console.log('═'.repeat(60));
  
  if (totalErrors > 0) {
    console.log('\n⚠ Some records failed to migrate. Check the errors above.');
  } else {
    console.log('\n🎉 All records migrated successfully!');
  }
}

async function clearMongoDBCollections() {
  console.log('\n🗑️  Clearing existing MongoDB collections...');
  
  const collections = [
    'slapolicies',
    'sites',
    'assets',
    'tickets',
    'ticketactivities',
    'ticketattachments',
    'workorders'
  ];
  
  for (const collName of collections) {
    try {
      await mongoose.connection.collection(collName).deleteMany({});
      console.log(`  ✓ Cleared: ${collName}`);
    } catch (err) {
      // Collection might not exist yet
    }
  }
  
  // Don't clear users to preserve the admin account
  console.log('  ⚠ Users collection preserved (will update/add users)');
}

async function runMigration() {
  console.log('\n' + '═'.repeat(60));
  console.log('🚀 SQL SERVER → MONGODB MIGRATION');
  console.log('═'.repeat(60));
  console.log(`Started at: ${new Date().toISOString()}`);
  
  let pool;
  
  try {
    // Connect to databases
    await connectMongoDB();
    pool = await connectSQL();
    
    // Clear existing data (optional - comment out to keep existing data)
    await clearMongoDBCollections();
    
    // Migrate in order (respecting foreign key dependencies)
    await migrateSLAPolicies(pool);
    await migrateSites(pool);
    await migrateUsers(pool);
    await migrateAssets(pool);
    await migrateTickets(pool);
    await migrateTicketActivities(pool);
    await migrateTicketAttachments(pool);
    await migrateWorkOrders(pool);
    await migrateSystemSettings(pool);
    
    // Print summary
    await printSummary();
    
    console.log(`\nCompleted at: ${new Date().toISOString()}`);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
  } finally {
    // Close connections
    if (pool) {
      await pool.close();
      console.log('🔌 SQL Server connection closed');
    }
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    
    process.exit(0);
  }
}

// Run migration
runMigration();
