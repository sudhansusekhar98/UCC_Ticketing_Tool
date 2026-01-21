# Sites Module

## Overview

The Sites module manages physical locations where surveillance equipment is installed. Sites serve as the primary organizational unit for assets and tickets.

---

## Features

### 📋 Site List

View all registered sites with their key information.

#### Displayed Information:

- Site Code
- Site Name
- Address
- Contact Person
- Total Assets
- Active Tickets

---

## Adding a Site

### Required Fields:

| Field         | Description                        |
| ------------- | ---------------------------------- |
| **Site Code** | Unique identifier (e.g., SITE-001) |
| **Site Name** | Full name of the location          |

### Optional Fields:

| Field             | Description            |
| ----------------- | ---------------------- |
| **Address**       | Physical address       |
| **City**          | City name              |
| **State**         | State/Province         |
| **Country**       | Country                |
| **Pincode**       | Postal/ZIP code        |
| **Contact Name**  | Primary contact person |
| **Contact Phone** | Contact phone number   |
| **Contact Email** | Contact email address  |
| **SLA Policy**    | Assigned SLA policy    |
| **Notes**         | Additional information |

---

## Site Detail View

### Overview Tab

- Site information
- Location details
- Contact information

### Assets Tab

- List of all assets at this site
- Quick link to asset details
- Add new asset button

### Tickets Tab

- All tickets related to this site
- Filter by status
- Create ticket for this site

### Statistics

- Total assets count
- Open tickets count
- Resolved tickets this month
- SLA compliance rate

---

## SLA Policy Assignment

Each site can have a specific SLA policy assigned:

1. Navigate to Site settings
2. Select SLA Policy from dropdown
3. Save changes

All tickets created for this site will inherit the SLA policy's:

- Response time targets
- Resolution time targets
- Escalation rules

---

## Site Hierarchy

Sites can be organized hierarchically:

```
Region
  └── City
        └── Site
              └── Zone
                    └── Asset
```

This helps in:

- Geographic filtering
- Regional reporting
- Hierarchical escalations

---

## Importing Sites

### CSV Import (Admin Only)

#### Required Columns:

```
siteCode,siteName
```

#### Example:

```csv
siteCode,siteName,address,city,state,contactName,contactPhone
SITE-001,Main Office,123 Main St,Mumbai,Maharashtra,John Doe,9876543210
SITE-002,Branch Office,456 Park Ave,Delhi,Delhi,Jane Smith,9876543211
```

---

## Managing Site Assets

### Adding Assets to a Site:

1. Go to Assets module
2. Click "Add Asset"
3. Select the Site from dropdown
4. Fill in asset details
5. Save

### Moving Assets Between Sites:

1. Edit the asset
2. Change the Site field
3. Save

Note: Historical records will show the original site.

---

## Site-Based Reporting

Reports can be filtered by site to view:

- Ticket statistics per site
- Asset health at each site
- SLA performance by location
- Engineer activity at sites

---

## Access Control

| Role       | Permissions                         |
| ---------- | ----------------------------------- |
| Admin      | Create, Edit, Delete sites          |
| Supervisor | View all sites, Edit assigned sites |
| Dispatcher | View sites, Create tickets          |
| Engineer   | View assigned sites only            |

---

## Tips

1. **Use consistent site codes** - Makes searching easier
2. **Keep contact info updated** - Essential for escalations
3. **Assign SLA policies** - Ensures proper ticket handling
4. **Group by region** - Helps in reporting
5. **Review site statistics** - Identify problem locations
