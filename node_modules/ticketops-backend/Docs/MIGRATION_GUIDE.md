# Migration Guide: .NET + SQL Server → Express.js + MongoDB

## Overview

This guide will help you migrate from the existing ASP.NET Core + SQL Server backend to the new Express.js + MongoDB backend.

## 🎯 Migration Strategy

### Phase 1: Setup New Backend (✅ COMPLETED)

- [x] Install Node.js and MongoDB
- [x] Create Express.js project structure
- [x] Define Mongoose models
- [x] Implement authentication
- [x] Create seed data script

### Phase 2: Data Migration (📋 TODO)

1. **Export existing data from SQL Server**
2. **Transform and import into MongoDB**
3. **Verify data integrity**

### Phase 3: API Implementation (🚧 IN PROGRESS)

- [x] Authentication endpoints
- [ ] Sites CRUD
- [ ] Assets CRUD
- [ ] Tickets CRUD
- [ ] Users management
- [ ] Work Orders
- [ ] Reports

### Phase 4: Frontend Integration (📋 TODO)

- [ ] Update API base URL
- [ ] Test all features
- [ ] Fix any breaking changes

### Phase 5: Deployment (📋 TODO)

- [ ] Setup production MongoDB
- [ ] Deploy Express.js backend
- [ ] Update frontend to use new backend
- [ ] Monitor and fix issues

## 📊 Data Migration Steps

### Step 1: Export Data from SQL Server

Create a SQL script to export data as JSON:

```sql
-- Export Users
SELECT
    UserId as _id,
    FullName as fullName,
    Email as email,
    Username as username,
    PasswordHash as passwordHash,
    Role as role,
    MobileNumber as mobileNumber,
    Designation as designation,
    SiteId as siteId,
    IsActive as isActive,
    CreatedOn as createdAt,
    LastLoginOn as lastLoginOn
FROM UserMaster
FOR JSON PATH;

-- Export Sites
SELECT
    SiteId as _id,
    SiteName as siteName,
    SiteUniqueID as siteUniqueID,
    City as city,
    Zone as zone,
    Ward as ward,
    Address as address,
    Latitude as latitude,
    Longitude as longitude,
    ContactPerson as contactPerson,
    ContactPhone as contactPhone,
    IsActive as isActive,
    CreatedOn as createdAt
FROM SiteMaster
FOR JSON PATH;

-- Export Assets
SELECT
    AssetId as _id,
    AssetCode as assetCode,
    AssetType as assetType,
    SerialNumber as serialNumber,
    MAC as mac,
    SiteId as siteId,
    LocationDescription as locationDescription,
    Criticality as criticality,
    Status as status,
    InstallationDate as installationDate,
    WarrantyEndDate as warrantyEndDate,
    Make as make,
    Model as model,
    ManagementIP as managementIP,
    IsActive as isActive,
    CreatedOn as createdAt
FROM AssetMaster
FOR JSON PATH;

-- Export Tickets
SELECT
    TicketId as _id,
    TicketNumber as ticketNumber,
    AssetId as assetId,
    Category as category,
    SubCategory as subCategory,
    Title as title,
    Description as description,
    Priority as priority,
    PriorityScore as priorityScore,
    Impact as impact,
    Urgency as urgency,
    Status as status,
    Source as source,
    CreatedBy as createdBy,
    AssignedTo as assignedTo,
    SLAPolicyId as slaPolicyId,
    CreatedOn as createdAt,
    AssignedOn as assignedOn,
    AcknowledgedOn as acknowledgedOn,
    ResolvedOn as resolvedOn,
    ClosedOn as closedOn
FROM TicketMaster
FOR JSON PATH;
```

### Step 2: Create Migration Script

Create `scripts/migrate-from-sql.js`:

```javascript
import mongoose from "mongoose";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const migrateData = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  // Read exported JSON files
  const users = JSON.parse(fs.readFileSync("./exports/users.json", "utf8"));
  const sites = JSON.parse(fs.readFileSync("./exports/sites.json", "utf8"));
  const assets = JSON.parse(fs.readFileSync("./exports/assets.json", "utf8"));
  const tickets = JSON.parse(fs.readFileSync("./exports/tickets.json", "utf8"));

  // Import into MongoDB
  await User.insertMany(users);
  await Site.insertMany(sites);
  await Asset.insertMany(assets);
  await Ticket.insertMany(tickets);

  console.log("Migration completed!");
  process.exit(0);
};

migrateData();
```

### Step 3: Run Migration

```bash
# 1. Export data from SQL Server and save as JSON files
# 2. Place JSON files in backend-express/exports/ directory
# 3. Run migration script
node scripts/migrate-from-sql.js
```

## 🔄 API Endpoint Mapping

### Authentication

| .NET Endpoint            | Express Endpoint         | Status |
| ------------------------ | ------------------------ | ------ |
| `POST /api/auth/login`   | `POST /api/auth/login`   | ✅     |
| `POST /api/auth/refresh` | `POST /api/auth/refresh` | ✅     |
| `GET /api/auth/me`       | `GET /api/auth/me`       | ✅     |
| `POST /api/auth/logout`  | `POST /api/auth/logout`  | ✅     |

### Sites (TODO)

| .NET Endpoint            | Express Endpoint        | Status |
| ------------------------ | ----------------------- | ------ |
| `GET /api/sites`         | `GET /api/sites`        | 📋     |
| `POST /api/sites`        | `POST /api/sites`       | 📋     |
| `GET /api/sites/{id}`    | `GET /api/sites/:id`    | 📋     |
| `PUT /api/sites/{id}`    | `PUT /api/sites/:id`    | 📋     |
| `DELETE /api/sites/{id}` | `DELETE /api/sites/:id` | 📋     |

### Assets (TODO)

| .NET Endpoint             | Express Endpoint         | Status |
| ------------------------- | ------------------------ | ------ |
| `GET /api/assets`         | `GET /api/assets`        | 📋     |
| `POST /api/assets`        | `POST /api/assets`       | 📋     |
| `GET /api/assets/{id}`    | `GET /api/assets/:id`    | 📋     |
| `PUT /api/assets/{id}`    | `PUT /api/assets/:id`    | 📋     |
| `DELETE /api/assets/{id}` | `DELETE /api/assets/:id` | 📋     |

### Tickets (TODO)

| .NET Endpoint           | Express Endpoint       | Status |
| ----------------------- | ---------------------- | ------ |
| `GET /api/tickets`      | `GET /api/tickets`     | 📋     |
| `POST /api/tickets`     | `POST /api/tickets`    | 📋     |
| `GET /api/tickets/{id}` | `GET /api/tickets/:id` | 📋     |
| `PUT /api/tickets/{id}` | `PUT /api/tickets/:id` | 📋     |

## 🔧 Frontend Changes Required

### 1. Update API Base URL

In `frontend/ucc-ticketing/src/services/api.js`:

```javascript
// OLD
const API_BASE_URL = "http://localhost:5000";

// NEW (if using different port)
const API_BASE_URL = "http://localhost:5000";
```

### 2. Update Response Structure

MongoDB uses `_id` instead of specific ID fields:

```javascript
// OLD
const userId = user.userId;
const siteId = site.siteId;

// NEW
const userId = user._id;
const siteId = site._id;
```

### 3. Update Date Handling

MongoDB uses `createdAt`/`updatedAt` instead of `CreatedOn`/`ModifiedOn`:

```javascript
// OLD
const created = ticket.createdOn;

// NEW
const created = ticket.createdAt;
```

## 🧪 Testing Checklist

- [ ] Login works with existing credentials
- [ ] Token refresh works
- [ ] Protected routes require authentication
- [ ] Role-based access control works
- [ ] All CRUD operations work
- [ ] File uploads work
- [ ] Real-time updates via Socket.IO work
- [ ] SLA calculations are correct
- [ ] Reports generate correctly

## 🚀 Deployment Considerations

### MongoDB Hosting Options

1. **MongoDB Atlas** (Recommended for production)

   - Free tier available
   - Automatic backups
   - Global distribution
   - Easy scaling

2. **Self-hosted MongoDB**
   - More control
   - Requires maintenance
   - Need to setup backups

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/ucc_ticketing
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<another-strong-secret>
CORS_ORIGIN=https://your-frontend-domain.com
```

## 📝 Rollback Plan

If migration fails:

1. Keep the old .NET backend running
2. Switch frontend back to old API URL
3. Debug issues in new backend
4. Retry migration when ready

## 🆘 Common Issues

### Issue: MongoDB Connection Failed

**Solution**: Check MongoDB is running and connection string is correct

### Issue: Authentication not working

**Solution**: Verify JWT_SECRET is set and tokens are being sent correctly

### Issue: Data not appearing

**Solution**: Check if seed script ran successfully and data was imported

## 📞 Support

For migration assistance, contact the development team.
