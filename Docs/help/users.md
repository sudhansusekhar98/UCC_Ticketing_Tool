# Users Module

## Overview

The Users module provides user account management, including creating users, assigning roles, and managing access permissions.

---

## Features

### 📋 User List

View all registered users with their roles and status.

#### Displayed Information:

- Full Name
- Username
- Email
- Role
- Status (Active/Inactive)
- Last Login

#### Filters:

- Role
- Status
- Site Assignment

---

## User Roles

### Available Roles:

| Role               | Description          | Access Level                   |
| ------------------ | -------------------- | ------------------------------ |
| **Admin**          | System administrator | Full access                    |
| **Supervisor**     | Team lead/Manager    | Manage tickets, users, reports |
| **Dispatcher**     | Ticket coordinator   | Create/assign tickets          |
| **Field Engineer** | On-site technician   | Work on assigned tickets       |
| **Viewer**         | Read-only access     | View only                      |

---

## Creating a User

### Required Fields:

| Field         | Description             |
| ------------- | ----------------------- |
| **Username**  | Login username (unique) |
| **Password**  | Initial password        |
| **Full Name** | User's display name     |
| **Email**     | Email address           |
| **Role**      | User role               |

### Optional Fields:

| Field              | Description               |
| ------------------ | ------------------------- |
| **Phone**          | Contact number            |
| **Assigned Sites** | Sites the user can access |
| **Employee ID**    | HR/Employee number        |
| **Department**     | Department name           |

---

## Role Permissions Matrix

### Tickets

| Action        | Admin | Supervisor | Dispatcher | Engineer | Viewer |
| ------------- | ----- | ---------- | ---------- | -------- | ------ |
| View All      | ✅    | ✅         | ✅         | ❌       | ✅     |
| View Assigned | ✅    | ✅         | ✅         | ✅       | ✅     |
| Create        | ✅    | ✅         | ✅         | ✅       | ❌     |
| Edit          | ✅    | ✅         | ✅         | Own Only | ❌     |
| Delete        | ✅    | ❌         | ❌         | ❌       | ❌     |
| Assign        | ✅    | ✅         | ✅         | ❌       | ❌     |
| Escalate      | ✅    | ✅         | ❌         | ❌       | ❌     |
| Close         | ✅    | ✅         | ❌         | ❌       | ❌     |

### Assets

| Action      | Admin | Supervisor | Dispatcher | Engineer | Viewer |
| ----------- | ----- | ---------- | ---------- | -------- | ------ |
| View        | ✅    | ✅         | ✅         | ✅       | ✅     |
| Create      | ✅    | ✅         | ❌         | ❌       | ❌     |
| Edit        | ✅    | ✅         | ❌         | ❌       | ❌     |
| Delete      | ✅    | ❌         | ❌         | ❌       | ❌     |
| Bulk Import | ✅    | ❌         | ❌         | ❌       | ❌     |

### Users

| Action         | Admin | Supervisor | Dispatcher | Engineer | Viewer |
| -------------- | ----- | ---------- | ---------- | -------- | ------ |
| View           | ✅    | ✅         | ❌         | ❌       | ❌     |
| Create         | ✅    | ❌         | ❌         | ❌       | ❌     |
| Edit           | ✅    | ❌         | ❌         | ❌       | ❌     |
| Delete         | ✅    | ❌         | ❌         | ❌       | ❌     |
| Reset Password | ✅    | ❌         | ❌         | ❌       | ❌     |

### Reports

| Action | Admin | Supervisor | Dispatcher | Engineer | Viewer |
| ------ | ----- | ---------- | ---------- | -------- | ------ |
| View   | ✅    | ✅         | ✅         | ❌       | ❌     |
| Export | ✅    | ✅         | ❌         | ❌       | ❌     |

---

## Managing Site Access

For roles other than Admin:

1. Edit the user profile
2. Go to "Site Access" section
3. Select sites the user can access
4. Save changes

Users will only see:

- Assets at assigned sites
- Tickets for assigned sites (except Engineers who see assigned tickets)

---

## Password Management

### Password Requirements:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Password Reset (Admin):

1. Go to Users list
2. Click on the user
3. Click "Reset Password"
4. Enter new password
5. User will be required to change on next login

### Self Password Change:

1. Go to Profile (click avatar)
2. Click "Change Password"
3. Enter current password
4. Enter new password twice
5. Click Save

---

## User Status

| Status       | Description                    |
| ------------ | ------------------------------ |
| **Active**   | Can login and use the system   |
| **Inactive** | Account disabled, cannot login |

### Deactivating a User:

1. Edit user profile
2. Toggle "Active" status to off
3. Save

The user will:

- Be logged out immediately
- Unable to login
- Still appear in historical records

---

## User Profile

Each user can access their profile to:

- Update display name
- Change email
- Update phone number
- Change password
- View activity history

---

## Tips

1. **Use descriptive usernames** - Makes searching easier
2. **Assign appropriate roles** - Follow principle of least privilege
3. **Review inactive users** - Deactivate if no longer needed
4. **Set site assignments** - Limits access appropriately
5. **Enable 2FA** - For admin accounts (if available)
