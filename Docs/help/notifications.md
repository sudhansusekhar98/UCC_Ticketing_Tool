# Notifications Module

## Overview

The Notifications module keeps you informed about important events in the system. Receive real-time alerts for ticket updates, SLA warnings, and system events.

---

## Features

### 🔔 Notification Types

| Type               | Description                     | Icon |
| ------------------ | ------------------------------- | ---- |
| **Ticket Created** | New ticket assigned to you      | 🎫   |
| **Ticket Updated** | Status change on your ticket    | 📝   |
| **Comment Added**  | New comment on your ticket      | 💬   |
| **SLA Warning**    | Ticket approaching SLA deadline | ⚠️   |
| **SLA Breached**   | Ticket exceeded SLA             | 🔴   |
| **Assignment**     | Ticket assigned/reassigned      | 👤   |
| **Escalation**     | Ticket escalated                | ⬆️   |
| **RMA Update**     | RMA status changed              | 🔄   |
| **System Alert**   | System-wide notifications       | ℹ️   |

---

## Notification Center

### Accessing Notifications:

1. Click the bell icon (🔔) in the header
2. Notification panel opens
3. View recent notifications
4. Click to navigate to related item

### Notification Badge:

- Shows unread count
- Updates in real-time
- Maximum display: 99+

---

## Notification List View

### Full Notification Page:

1. Click "View All" in notification panel
2. Or navigate to Notifications from sidebar

### Features:

- Search notifications
- Filter by type
- Filter by read/unread
- Mark all as read
- Delete notifications

### List Columns:

| Column  | Description           |
| ------- | --------------------- |
| Type    | Notification category |
| Message | Notification content  |
| Time    | When it was sent      |
| Status  | Read/Unread indicator |

---

## Managing Notifications

### Mark as Read:

- Click on notification
- Or click "Mark as Read" button
- Or "Mark All as Read"

### Delete Notifications:

- Click delete icon on individual
- Or select multiple and delete
- Deleted notifications cannot be recovered

### Notification Retention:

- Notifications older than 30 days are auto-deleted
- Read notifications deleted after 7 days
- SLA alerts retained for 90 days

---

## Real-Time Updates

Notifications are delivered in real-time using WebSocket connection:

### Live Updates:

- No page refresh needed
- Instant notification pop-up
- Badge count updates automatically
- Sound alert (if enabled)

### Connection Status:

- 🟢 Connected - Real-time active
- 🔴 Disconnected - Page refresh required

---

## Notification Preferences

### Configuring Preferences (Profile > Notifications):

#### In-App Notifications:

| Setting        | Default | Description                |
| -------------- | ------- | -------------------------- |
| Ticket Created | ✅ On   | When assigned a new ticket |
| Status Changes | ✅ On   | When ticket status changes |
| Comments       | ✅ On   | When someone comments      |
| SLA Warnings   | ✅ On   | Before SLA breach          |
| SLA Breaches   | ✅ On   | When SLA is breached       |
| Escalations    | ✅ On   | When ticket escalated      |
| RMA Updates    | ✅ On   | RMA workflow updates       |

#### Email Notifications:

| Setting         | Default | Description           |
| --------------- | ------- | --------------------- |
| New Assignments | ✅ On   | Email for new tickets |
| SLA Alerts      | ✅ On   | Email for SLA issues  |
| Daily Digest    | ❌ Off  | Summary email daily   |
| Weekly Report   | ❌ Off  | Summary email weekly  |

---

## Notification Actions

From each notification, you can:

1. **View Details** - Go to related ticket/asset
2. **Mark as Read** - Remove from unread
3. **Dismiss** - Hide notification
4. **Delete** - Remove permanently

---

## Admin Notifications Management

### System-Wide Notifications (Admin):

1. Go to Notifications > Management
2. Click "Create Notification"
3. Enter message
4. Select recipients:
   - All Users
   - Specific Roles
   - Specific Users
5. Set priority (Normal/Important)
6. Send

### Scheduled Notifications:

- Schedule for future time
- Recurring notifications
- Automatic expiry

---

## Troubleshooting

### Not Receiving Notifications:

1. **Check Preferences** - Ensure notifications are enabled
2. **Check Connection** - Look for connection indicator
3. **Refresh Page** - Re-establish WebSocket
4. **Clear Cache** - Browser cache issues
5. **Check Browser** - Allow notifications in browser

### Email Not Arriving:

1. Check spam folder
2. Verify email address in profile
3. Contact admin to verify SMTP settings

---

## Tips

1. **Enable SLA alerts** - Never miss deadlines
2. **Check regularly** - Stay updated
3. **Use filters** - Focus on important items
4. **Enable email backup** - For when offline
5. **Configure preferences** - Reduce noise
