# RMA (Return Merchandise Authorization) Module

## Overview

The RMA module handles device replacement workflows within tickets. When an asset needs replacement, engineers can request an RMA, and supervisors/admins can approve and track the replacement process.

---

## Features

### 📦 RMA Workflow

```
Request → Approval → Ordering → Dispatch → Receive → Install → Complete
```

### Status Definitions:

| Status         | Description                           |
| -------------- | ------------------------------------- |
| **Requested**  | Engineer has submitted RMA request    |
| **Approved**   | Supervisor/Admin approved the request |
| **Rejected**   | Request was denied (with reason)      |
| **Ordered**    | Replacement device ordered            |
| **Dispatched** | Device shipped/in transit             |
| **Received**   | Device received at site               |
| **Installed**  | New device installed                  |
| **Completed**  | RMA process finished                  |

---

## Requesting an RMA

### Prerequisites:

- Ticket must be "In Progress"
- User must be assigned to the ticket
- Asset must be linked to the ticket

### Steps:

1. Open the ticket detail
2. Go to "RMA" tab
3. Click "Request RMA"
4. Fill in the form:
   - **Reason** - Why replacement is needed
   - **Notes** - Additional details
   - **Urgency** - Normal/Urgent
5. Submit request

### Request Form Fields:

| Field   | Required | Description            |
| ------- | -------- | ---------------------- |
| Reason  | Yes      | Reason for replacement |
| Notes   | No       | Additional information |
| Urgency | No       | Normal or Urgent       |
| Photos  | No       | Upload evidence        |

---

## Approving/Rejecting RMAs

### For Supervisors/Admins:

1. Go to ticket with pending RMA
2. Open RMA tab
3. Review request details
4. Click "Approve" or "Reject"

### Approval:

- Confirm approval
- Add approval notes (optional)
- RMA status changes to "Approved"

### Rejection:

- Provide rejection reason (required)
- Engineer is notified
- Can request again with modifications

---

## RMA Status Updates

### Updating RMA Status:

1. Open ticket with approved RMA
2. Go to RMA tab
3. Click "Update Status"
4. Select new status
5. Add notes if required
6. Save

### Status Progression:

```
Approved → Ordered → Dispatched → Received → Installed
```

Each status change:

- Records who made the change
- Records timestamp
- Adds to activity log
- Notifies relevant parties

---

## Asset Update After RMA

### After RMA Installation:

When marking RMA as "Installed", engineer can update asset details:

1. RMA prompts for new device details
2. Enter new information:
   - Serial Number
   - IP Address
   - MAC Address
3. Submit update
4. Asset record is updated

### Temporary Access:

- 30-minute window to update asset
- Only allowed fields editable
- After timeout, requires admin

---

## RMA Dashboard

### Viewing All RMAs:

Supervisors and Admins can view all RMAs:

1. Go to Reports module
2. View RMA Statistics card
3. See breakdown by status

### RMA Reports:

- Export RMA data to Excel
- Filter by date range
- Filter by site
- Filter by status

---

## RMA Timeline

Each RMA shows a visual timeline:

```
┌─────────────────────────────────────────────────────────────┐
│ Requested    Approved    Ordered    Received    Installed  │
│     ●──────────●──────────●──────────●──────────●          │
│   Jan 20    Jan 20     Jan 21     Jan 23     Jan 24        │
└─────────────────────────────────────────────────────────────┘
```

Click on any step to see details.

---

## Notifications

### RMA-Related Notifications:

| Event          | Notified            |
| -------------- | ------------------- |
| RMA Requested  | Supervisor, Admin   |
| RMA Approved   | Requesting Engineer |
| RMA Rejected   | Requesting Engineer |
| Status Updated | Related parties     |
| RMA Completed  | All stakeholders    |

---

## Access Control

| Action        | Admin | Supervisor | Engineer           |
| ------------- | ----- | ---------- | ------------------ |
| Request RMA   | ✅    | ✅         | ✅ (assigned only) |
| Approve RMA   | ✅    | ✅         | ❌                 |
| Reject RMA    | ✅    | ✅         | ❌                 |
| Update Status | ✅    | ✅         | ✅ (limited)       |
| Update Asset  | ✅    | ✅         | ✅ (after install) |

---

## Best Practices

1. **Provide clear reason** - Speeds up approval
2. **Attach photos** - Visual evidence helps
3. **Update status promptly** - Keeps timeline accurate
4. **Verify new serial** - Ensure asset data is correct
5. **Complete the process** - Don't leave RMAs pending

---

## Troubleshooting

### Can't Request RMA:

- Check if ticket is "In Progress"
- Verify you're assigned to ticket
- Ensure asset is linked

### Can't Update Asset:

- Check if RMA is "Installed"
- Verify you're within time window
- Check if fields are editable

### Status Won't Change:

- Must follow progression order
- Previous status must be saved
- Check for validation errors
