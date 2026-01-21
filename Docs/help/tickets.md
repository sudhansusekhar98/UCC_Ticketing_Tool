# Tickets Module

## Overview

The Tickets module is the core of TicketOps, allowing you to create, track, and manage support tickets for surveillance infrastructure issues.

---

## Features

### 📋 Ticket List

View all tickets with powerful filtering and sorting options.

#### Filters Available:

- **Status**: Open, Assigned, Acknowledged, In Progress, On Hold, Escalated, Resolved, Closed
- **Priority**: P1 (Critical), P2 (High), P3 (Medium), P4 (Low)
- **Category**: Hardware, Software, Network, Power, Connectivity, Other
- **Site**: Filter by location
- **Assigned To**: Filter by engineer
- **SLA Status**: Breached, At Risk, On Track
- **Date Range**: Filter by creation date

#### Actions:

- **Search**: Find tickets by ticket number, title, or description
- **Sort**: Click column headers to sort
- **Export**: Download ticket data (Admin/Supervisor)

---

## Creating a Ticket

### Required Fields:

1. **Site** - Select the location where the issue occurred
2. **Category** - Type of issue (Hardware, Software, etc.)
3. **Title** - Brief description of the problem
4. **Priority** - Urgency level

### Optional Fields:

- **Asset** - Link to specific device/equipment
- **Sub-Category** - More specific categorization
- **Description** - Detailed explanation of the issue
- **Impact/Urgency** - Used for automatic priority calculation

### Auto-Generated:

- **Ticket Number** - Format: TKT-YYYYMMDD-XXXX
- **SLA Deadlines** - Based on priority and SLA policy

---

## Ticket Detail View

### Header Information

- Ticket number, status badge, priority indicator
- Created date, assigned engineer, site location

### Tabs Available:

#### Details Tab

- Full ticket information
- Asset details (if linked)
- Resolution summary

#### Activity Tab

- Timeline of all actions taken
- Status changes, notes, assignments
- Attachment uploads

#### RMA Tab

- Device Replacement requests
- RMA status tracking
- Installation workflow

---

## Ticket Lifecycle

```
Open → Assigned → Acknowledged → In Progress → Resolved → Verified → Closed
                       ↓                           ↓
                   On Hold                   Resolution Rejected
                       ↓
                  Escalated
```

### Status Descriptions:

| Status           | Description                                |
| ---------------- | ------------------------------------------ |
| **Open**         | Newly created, awaiting assignment         |
| **Assigned**     | Engineer assigned, awaiting acknowledgment |
| **Acknowledged** | Engineer has accepted the ticket           |
| **In Progress**  | Work is actively being done                |
| **On Hold**      | Paused (waiting for parts, approval, etc.) |
| **Escalated**    | Requires higher-level attention            |
| **Resolved**     | Issue fixed, awaiting verification         |
| **Verified**     | Customer confirmed resolution              |
| **Closed**       | Ticket completed                           |

---

## SLA Management

### Priority SLA Targets:

| Priority | Response Time | Resolution Time |
| -------- | ------------- | --------------- |
| P1       | 15 minutes    | 4 hours         |
| P2       | 30 minutes    | 8 hours         |
| P3       | 2 hours       | 24 hours        |
| P4       | 4 hours       | 48 hours        |

### SLA Indicators:

- 🟢 **On Track** - Within SLA limits
- 🟡 **At Risk** - Approaching deadline
- 🔴 **Breached** - SLA exceeded

---

## Actions

### For All Users:

- View ticket details
- Add comments/notes
- Upload attachments

### For Assigned Engineers:

- Start work (Acknowledge)
- Update status
- Add resolution summary
- Request RMA

### For Supervisors/Admin:

- Assign/reassign tickets
- Escalate tickets
- Close tickets
- Approve RMA requests

---

## Tips

1. **Use filters** to quickly find relevant tickets
2. **Set priority correctly** - It determines SLA deadlines
3. **Link to assets** when the issue is device-specific
4. **Add detailed notes** for better tracking
5. **Upload photos** when reporting hardware issues
