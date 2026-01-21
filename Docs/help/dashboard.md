# Dashboard Module

## Overview

The Dashboard provides a real-time overview of your workspace activity, displaying key metrics, charts, and quick actions for efficient navigation.

---

## Features

### 📊 Statistics Cards

The dashboard displays four primary metrics:

| Card               | Description                                   |
| ------------------ | --------------------------------------------- |
| **Open Tickets**   | Number of tickets awaiting action             |
| **In Progress**    | Tickets currently being worked on             |
| **SLA Breached**   | Tickets that have exceeded their SLA deadline |
| **SLA Compliance** | Percentage of tickets resolved within SLA     |

**Tip**: Click on any stat card to view the filtered list of tickets.

---

### 👥 Team Overview

#### Total Assets Monitored

- Shows count of all registered assets
- Displays a scrollable list of assets with their online/offline status
- Click "Manage Assets →" to go to full asset management

#### Active Engineers

- Shows number of available field engineers
- Lists engineers with their current status
- Click "Manage Team →" to access user management (Admin only)

---

### 📈 Charts

#### Tickets by Priority

- **Donut chart** showing distribution of tickets by priority level
- Priority levels: P1 (Critical), P2 (High), P3 (Medium), P4 (Low)

#### Tickets by Status

- **Bar chart** showing ticket count per status
- Statuses: Open, Assigned, Acknowledged, In Progress, Resolved, Closed

#### Ticket Categories

- **Progress bars** showing ticket distribution by category
- Categories: Hardware, Software, Network, Power, Connectivity, Other

---

### ⚡ Quick Actions

| Action            | Description           |
| ----------------- | --------------------- |
| **Create Ticket** | Log a new issue       |
| **Add Asset**     | Register a new device |
| **Open Tickets**  | View pending tickets  |
| **SLA Breaches**  | View urgent items     |

---

## Auto-Refresh

The dashboard automatically refreshes every **30 seconds** to ensure you always have the latest data.

You can also manually refresh by clicking the **Refresh** button in the top-right corner.

---

## Navigation

From the Dashboard, you can navigate to:

- **Tickets**: Click stat cards or quick actions
- **Assets**: Click "Manage Assets" link
- **Users**: Click "Manage Team" link (Admin only)
- **Reports**: Access via sidebar navigation
