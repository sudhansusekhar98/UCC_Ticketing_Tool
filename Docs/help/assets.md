# Assets Module

## Overview

The Assets module allows you to manage surveillance infrastructure devices and equipment. Track device status, maintenance history, and link assets to tickets for comprehensive issue tracking.

---

## Features

### 📋 Asset List

View all registered assets with filtering and search capabilities.

#### Filters Available:

- **Device Type**: Camera, NVR, Server, Switch, Router, UPS, Other
- **Status**: Operational, Faulty, Under Maintenance, Decommissioned
- **Site**: Filter by location
- **Criticality**: High, Medium, Low

#### Columns:

- Asset Code
- Device Type
- Site Location
- IP Address
- Status
- Last Updated

---

## Adding an Asset

### Required Fields:

| Field           | Description                     |
| --------------- | ------------------------------- |
| **Asset Code**  | Unique identifier for the asset |
| **Device Type** | Type of equipment               |
| **Site**        | Physical location               |
| **Status**      | Current operational status      |

### Optional Fields:

| Field               | Description                        |
| ------------------- | ---------------------------------- |
| **Serial Number**   | Manufacturer serial number         |
| **IP Address**      | Network address                    |
| **MAC Address**     | Hardware address                   |
| **Model**           | Device model name                  |
| **Make**            | Manufacturer name                  |
| **Zone**            | Area within site                   |
| **Criticality**     | Importance level (High/Medium/Low) |
| **Warranty Expiry** | Warranty end date                  |
| **Notes**           | Additional information             |

---

## Asset Detail View

### Header Information

- Asset code and device type
- Current status with color indicator
- Site location
- Criticality badge

### Sections:

#### General Information

- Make, model, serial number
- Installation date
- Warranty status

#### Network Details

- IP Address
- MAC Address
- Port/connection info

#### Location

- Site name
- Zone/area within site
- Physical description

#### Maintenance History

- List of related tickets
- RMA records
- Status changes

---

## Device Types

| Type        | Description                  |
| ----------- | ---------------------------- |
| **Camera**  | CCTV/IP cameras              |
| **NVR**     | Network Video Recorder       |
| **Server**  | Recording/Analytics servers  |
| **Switch**  | Network switches             |
| **Router**  | Network routers              |
| **UPS**     | Uninterruptible Power Supply |
| **Encoder** | Video encoders               |
| **Other**   | Miscellaneous equipment      |

---

## Status Values

| Status                | Description               | Indicator   |
| --------------------- | ------------------------- | ----------- |
| **Operational**       | Working normally          | 🟢 Online   |
| **Faulty**            | Not working, needs repair | 🔴 Offline  |
| **Under Maintenance** | Currently being serviced  | 🟡 Warning  |
| **Decommissioned**    | No longer in use          | ⚫ Inactive |

---

## Bulk Import

### CSV Import (Admin Only)

Upload multiple assets at once using a CSV file.

#### Required CSV Columns:

```
assetCode,deviceType,siteId,status
```

#### Example:

```csv
assetCode,deviceType,siteId,status,ipAddress,serialNumber
CAM-001,Camera,site123,Operational,192.168.1.100,SN123456
NVR-001,NVR,site123,Operational,192.168.1.10,SN789012
```

---

## Linking Assets to Tickets

When creating a ticket:

1. Select the Site first
2. Choose the Asset from the dropdown
3. The asset's details will be displayed in the ticket

Benefits:

- Track issues per device
- View asset maintenance history
- Automated warranty checks

---

## RMA (Return Merchandise Authorization)

When an asset needs replacement:

1. Open the ticket linked to the asset
2. Go to RMA tab
3. Click "Request RMA"
4. Fill in the reason and details
5. Submit for approval

RMA Workflow:

```
Requested → Approved → Ordered → Dispatched → Received → Installed
```

After RMA completion, you can update the asset's:

- Serial Number
- IP Address
- MAC Address

---

## Tips

1. **Use unique asset codes** - Makes searching easier
2. **Keep IP addresses updated** - Essential for network diagnostics
3. **Set criticality correctly** - Affects ticket priority calculation
4. **Track warranty dates** - Plan replacements proactively
5. **Link assets to tickets** - Builds maintenance history
