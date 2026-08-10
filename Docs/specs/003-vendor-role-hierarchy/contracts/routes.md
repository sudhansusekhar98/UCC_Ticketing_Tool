# Route Contracts: Vendor Role, Org Chart, Vendor Log Fix

## New frontend route

| Path | Component | Roles | Description |
|------|-----------|-------|-------------|
| `/users/org-chart` | `OrgChart` | Admin, Supervisor | Employee hierarchy tree |

## New frontend files

```text
frontend/src/pages/users/
├── OrgChart.jsx            (new — SVG tree, no npm packages)
└── Users.css               (modified — add role-vendor badge class, org-chart node styles)
```

## Modified frontend files

| File | Change |
|------|--------|
| `frontend/src/App.jsx` | Add `/users/org-chart` route + OrgChart import |
| `frontend/src/pages/users/UserForm.jsx` | Add reportsTo select field; fix site validation for Vendor role |
| `frontend/src/pages/users/UsersList.jsx` | Add toggle Employees/Vendors; add role-vendor badge; add Org Chart button |
| `frontend/src/pages/fieldops/vendor-logs/VendorWorkLogForm.jsx` | Fix vendor filter: `role === 'Vendor'` |

## Modified backend files

| File | Change |
|------|--------|
| `backend-express/models/User.model.js` | Add 'Vendor' to enum; add reportsTo field + index |
| `backend-express/models/Notification.model.js` | Add 'Vendor' (+ 'SiteClient') to targetRoles enum |
| `backend-express/controllers/lookup.controller.js` | Add Vendor to getRoles() |

## No new API endpoints

The existing `GET /api/users?role=Vendor` already works via the `usersApi.getAll` params.
The existing `PUT /api/users/:id` accepts `reportsTo` via body spread.

## OrgChart component contracts

```
Props: none

Internal:
  - Fetches all active users on mount
  - Splits into employees (non-Vendor) for tree; vendors excluded from tree
  - Builds OrgNode tree from reportsTo references
  - Renders SVG container + positioned div nodes
  - Each node links to /users/:id/edit
  - "Back to Users" link at top

Layout:
  - Container: min-height 600px, overflow: auto, position: relative
  - SVG: absolute, covers full container, pointer-events: none
  - Nodes: position: absolute, 160×72px cards
```
