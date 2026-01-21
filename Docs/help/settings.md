# Settings Module

## Overview

The Settings module provides system configuration options for administrators. Customize system behavior, manage lookups, and configure SLA policies.

---

## Features

### ⚙️ Available Settings

#### General Settings

- System name and branding
- Default timezone
- Date/time format
- Language preferences

#### Ticket Settings

- Auto-assignment rules
- Default priority
- Ticket number format
- Require verification toggle

#### Notification Settings

- Email notifications toggle
- In-app notifications
- Escalation alerts
- SLA warning thresholds

#### SLA Configuration

- SLA policies management
- Response time targets
- Resolution time targets
- Escalation rules

---

## SLA Policies

### Creating an SLA Policy:

1. Go to Settings > SLA Policies
2. Click "Add Policy"
3. Enter policy name
4. Set targets for each priority:

| Priority | Response Time | Resolution Time |
| -------- | ------------- | --------------- |
| P1       | 15 minutes    | 4 hours         |
| P2       | 30 minutes    | 8 hours         |
| P3       | 2 hours       | 24 hours        |
| P4       | 4 hours       | 48 hours        |

5. Configure escalation rules
6. Save policy

### Assigning SLA to Sites:

1. Edit Site
2. Select SLA Policy
3. Save

All tickets for that site will use this SLA.

---

## Lookup Values

### Managing Lookups:

Lookups are predefined values for dropdowns:

#### Categories

- Hardware
- Software
- Network
- Power
- Connectivity
- Other

#### Sub-Categories (per Category)

Example for Hardware:

- Camera Failure
- NVR Issue
- Power Supply
- Physical Damage

#### Device Types

- Camera
- NVR
- Server
- Switch
- Router
- UPS
- Other

### Adding a Lookup:

1. Go to Settings > Lookups
2. Select lookup type
3. Click "Add"
4. Enter value
5. Save

### Editing/Deleting:

- Click edit icon to modify
- Click delete to remove
- Cannot delete if in use

---

## Email Configuration

### SMTP Settings (Admin Only):

| Setting    | Description           |
| ---------- | --------------------- |
| SMTP Host  | Mail server address   |
| SMTP Port  | Port number (587/465) |
| Username   | SMTP username         |
| Password   | SMTP password         |
| From Email | Sender email address  |
| From Name  | Sender display name   |

### Email Templates:

- Ticket Created
- Ticket Assigned
- Status Changed
- SLA Warning
- SLA Breached
- Resolution Notification

---

## User Rights Management

### Custom Permissions (Admin Only):

1. Go to Settings > User Rights
2. Select Role
3. Toggle permissions:
   - Module Access
   - Create/Edit/Delete
   - Export Data
   - Admin Functions

### Available Permissions:

#### Tickets Module:

- View All Tickets
- View Assigned Only
- Create Tickets
- Edit Tickets
- Delete Tickets
- Assign Tickets
- Escalate Tickets
- Close Tickets

#### Assets Module:

- View Assets
- Create Assets
- Edit Assets
- Delete Assets
- Bulk Import

#### Reports Module:

- View Reports
- Export Reports

#### Admin Module:

- Manage Users
- Manage Settings
- Manage Lookups

---

## System Preferences

### Display Settings:

- Items per page (10/25/50/100)
- Default sort order
- Date format (DD/MM/YYYY or MM/DD/YYYY)
- Time format (12h or 24h)

### Password Policy:

- Minimum length
- Require uppercase
- Require numbers
- Require special characters
- Password expiry (days)

### Session Settings:

- Session timeout (minutes)
- Remember me duration
- Maximum login attempts
- Lockout duration

---

## Backup & Maintenance

### Data Backup (Admin Only):

- Manual backup trigger
- Backup schedule
- Backup retention policy

### System Logs:

- View activity logs
- Filter by user
- Filter by action
- Export logs

---

## Access Control

Only **Admin** role can access Settings module.

---

## Tips

1. **Set SLA policies first** - Before creating sites
2. **Configure notifications** - Keep team informed
3. **Review lookups** - Keep lists clean and relevant
4. **Set strong password policy** - Security best practice
5. **Regular backups** - Protect your data
