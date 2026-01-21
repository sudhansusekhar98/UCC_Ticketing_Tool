# Reports Module

## Overview

The Reports module provides comprehensive analytics and data export capabilities. Generate insights from ticket, asset, and RMA data with various filtering options.

---

## Features

### 📊 Dashboard Statistics

View real-time metrics displayed as charts and cards:

#### Ticket Statistics

- Total tickets count
- Open vs Closed ratio
- Average resolution time

#### SLA Performance

- Compliance percentage
- Breached tickets count
- At-risk tickets

#### Asset Statistics

- Total assets by type
- Online vs Offline count
- Status distribution

#### RMA Statistics

- Total RMA requests
- RMA by status
- Monthly trends

---

## Available Reports

### 1. Tickets Report

Export comprehensive ticket data including:

- Ticket number and title
- Status and priority
- Category and sub-category
- Site and asset information
- Created date and creator
- Assigned engineer
- SLA status (Met/Breached)
- Resolution details

### 2. Employee Status Report

Export field engineer activity:

- Engineer name and contact
- Role and department
- Assigned site(s)
- Active tickets count
- Resolved tickets (period)
- Login status

### 3. Asset Status Report

Export asset inventory:

- Asset code and type
- Site location
- IP/MAC addresses
- Serial number
- Current status
- Criticality level
- Warranty expiry
- Related tickets count

### 4. RMA Report

Export RMA requests:

- RMA request ID
- Original asset details
- Request reason
- Status and timeline
- Replacement asset info
- Completion date

---

## Filtering Reports

### Available Filters:

| Filter         | Description                |
| -------------- | -------------------------- |
| **Date Range** | Start and End date         |
| **Site**       | Filter by location         |
| **Status**     | Filter by item status      |
| **Priority**   | Filter tickets by priority |
| **Category**   | Filter by ticket category  |

### Applying Filters:

1. Click on filter dropdowns
2. Select desired values
3. Dashboard updates automatically
4. Export with filters applied

---

## Charts

### Ticket Status Distribution

- **Bar Chart**: Visual breakdown of tickets by status
- Hover for exact counts
- Click to filter

### Priority Distribution

- **Donut Chart**: P1/P2/P3/P4 breakdown
- Color-coded by priority
- Percentages shown

### Category Breakdown

- **Progress Bars**: Ticket count per category
- Visual fill percentage
- Ordered by count

### Monthly Trend

- **Area Chart**: Tickets over time
- Shows pattern trends
- Hover for date details

### RMA Status

- **Pie Chart**: RMA by current status
- Color-coded by status
- Interactive tooltips

---

## Exporting Data

### Export Formats:

- **Excel (.xlsx)** - Primary format

### Export Process:

1. Apply desired filters
2. Select report type from dropdown
3. Click "Export Report" button
4. File downloads automatically

### Export Contents:

Each export includes:

- Header row with column names
- Filtered data rows
- Export timestamp in filename

#### Filename Format:

```
[report-type]_report_YYYYMMDD_HHMMSS.xlsx
```

Example: `tickets_report_20260121_163000.xlsx`

---

## Report Types Detail

### Tickets Report Columns:

| Column         | Description          |
| -------------- | -------------------- |
| Ticket Number  | Unique identifier    |
| Title          | Ticket title         |
| Description    | Issue description    |
| Status         | Current status       |
| Priority       | P1/P2/P3/P4          |
| Category       | Issue category       |
| Site           | Location name        |
| Asset          | Linked asset code    |
| Created At     | Creation timestamp   |
| Created By     | Reporter name        |
| Assigned To    | Engineer name        |
| Resolved At    | Resolution timestamp |
| SLA Response   | Met/Breached         |
| SLA Resolution | Met/Breached         |

### Employee Report Columns:

| Column           | Description      |
| ---------------- | ---------------- |
| Name             | Full name        |
| Email            | Email address    |
| Phone            | Contact number   |
| Role             | System role      |
| Site             | Assigned site(s) |
| Status           | Active/Inactive  |
| Tickets Assigned | Current count    |
| Tickets Resolved | Period count     |

### Asset Report Columns:

| Column          | Description        |
| --------------- | ------------------ |
| Asset Code      | Unique identifier  |
| Device Type     | Equipment type     |
| Site            | Location           |
| Status          | Operational status |
| IP Address      | Network address    |
| Serial Number   | Manufacturer SN    |
| Make/Model      | Brand and model    |
| Criticality     | Importance level   |
| Warranty Expiry | Warranty end date  |

### RMA Report Columns:

| Column         | Description          |
| -------------- | -------------------- |
| RMA ID         | Request identifier   |
| Ticket Number  | Related ticket       |
| Original Asset | Asset being replaced |
| Reason         | Replacement reason   |
| Status         | Current RMA status   |
| Requested Date | Request timestamp    |
| Approved By    | Approver name        |
| Completed Date | Completion timestamp |
| New Asset      | Replacement details  |

---

## Access Control

| Role       | View Reports | Export Data |
| ---------- | ------------ | ----------- |
| Admin      | ✅           | ✅          |
| Supervisor | ✅           | ✅          |
| Dispatcher | ✅           | ❌          |
| Engineer   | ❌           | ❌          |
| Viewer     | ❌           | ❌          |

---

## Tips

1. **Use date filters** - Narrow down to specific periods
2. **Filter by site** - Compare site performance
3. **Export regularly** - Create records for audits
4. **Monitor SLA** - Track compliance trends
5. **Review RMA** - Identify recurring failures
