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
- **Sub-Category** - More specific categorization (see below for smart suggestions)
- **Description** - Detailed explanation of the issue
- **Impact/Urgency** - Used for automatic priority calculation

### Sub-Category Smart Suggestions

When you select a **Category**, the Sub-Category field shows clickable suggestion chips tailored to that category. Click any chip to fill the field instantly, or type a custom value.

| Category | Suggested Sub-Categories |
|---|---|
| Connectivity | Fibre Cut, Cable Cut, Cable Damage, Link Down, Latency Issue, Loop Detected |
| Network | Fibre Cut, Cable Damage, Switch Failure, Port Down, IP Conflict, DNS Issue |
| Hardware | Camera Malfunction, NVR Failure, Power Supply Failure, Physical Damage |
| Power | Power Outage, UPS Failure, Overload, Tripped Breaker |
| Software | Firmware Upgrade, Configuration Error, Software Crash, Login Issue |

> **Note:** Changing the Category clears any previously selected Sub-Category so you always start with the right set of options.

### Cable / Fibre Cut Tickets

If the Sub-Category contains **Fibre Cut**, **Cable Cut**, or **Cable Damage**, a blue notice appears on the create ticket form:

> *Cable stock tracking will be enabled on this ticket. Engineers will be able to record cable/wire usage directly from the ticket detail page, and the stock quantity will be deducted automatically.*

This means once the ticket is created, a **Cable / Wire Usage** panel will appear on the ticket detail page, allowing engineers to log how much cable was used during the repair. Stock quantities are updated automatically based on the entries made.

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

## Cable / Wire Usage Panel

This panel appears automatically on the ticket detail page when the ticket's Sub-Category identifies it as a fibre or cable cut issue (e.g., "Fibre Cut", "Cable Cut", "Cable Damage").

### What It Shows

- **Available at Site** — All cable and wire items currently in stock at the ticket's site, with their available quantity and unit (e.g., 50 meters, 3 boxes).
- **Usage History** — A log of all cable quantities recorded against this ticket, showing who recorded it and when. The running total is displayed at the top right of the history section.

### Recording Cable Usage

Only available while the ticket is active (not Resolved, Verified, Closed, or Cancelled).

**Who can record:** Admin, Supervisor, Dispatcher, L1 Engineer, L2 Engineer.

**Steps:**

1. Click **Record Usage** in the top-right of the Cable / Wire Usage panel.
2. In the modal that opens:
   - **Select the cable item** from the dropdown — items with zero stock are shown but disabled.
   - **Enter the quantity used** — the unit (e.g., meters, box) is shown next to the field. The maximum available quantity is displayed as a hint. You cannot enter more than what is available.
   - **Add a note** (optional) — e.g., "Replaced 15m at junction box B".
3. Click **Confirm**.

The stock quantity for the selected item is immediately reduced by the entered amount. If the quantity reaches zero, the item remains visible in the stock list at 0 so stock managers know to reorder.

> **Important:** Usage entries cannot be edited or deleted. If a wrong quantity was entered, add a corrective note entry explaining the discrepancy.

### Cross-Site Stock

Cable usage can only be recorded against stock available at the ticket's own site. Head-office or other-site stock is not accessible from this panel.

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
6. **Use Sub-Category chips** to categorise tickets faster — click a chip instead of typing
7. **Select "Fibre Cut" or "Cable Cut"** as the Sub-Category for cable repair tickets to enable automatic cable stock tracking on the ticket detail page
8. **Record cable usage as you work** — the stock deduction happens immediately, keeping inventory accurate in real time
