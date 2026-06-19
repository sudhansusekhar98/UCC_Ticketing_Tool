# Quickstart: Vendor Role, Org Chart, Vendor Log Fix

## Validate after implementation

### Feature 1: Vendor role

1. Start backend: `cd backend-express && npm run dev`
2. Create a user via API or UI with `role: 'Vendor'` — should succeed without assignedSites.
3. Open UsersList → Employees tab shows only non-vendor users; switch to Vendors tab → vendor appears with amber badge.

### Feature 2: Org Chart

1. Create 3–4 users with `reportsTo` set to each other (set via UserForm "Reports To" field).
2. Navigate to `/users/org-chart` — tree renders with SVG lines.
3. A root node (no manager) appears at the top.
4. Click a node → navigates to user edit page.

### Feature 3: VendorWorkLogForm fix

1. Ensure at least 1 Vendor user and 3+ non-vendor users exist.
2. Open any project → "Add Vendor Work Log" → Vendor dropdown shows ONLY the Vendor user.

### ESLint
```bash
cd frontend && npm run lint -- --max-warnings=9999
# Only pre-existing warnings; zero new errors
```

## Key files changed

| File | Change type |
|------|------------|
| `backend-express/models/User.model.js` | Enum + reportsTo field |
| `backend-express/models/Notification.model.js` | Enum fix |
| `backend-express/controllers/lookup.controller.js` | getRoles() |
| `frontend/src/pages/users/OrgChart.jsx` | New page |
| `frontend/src/pages/users/UserForm.jsx` | reportsTo + site validation |
| `frontend/src/pages/users/UsersList.jsx` | Toggle + badge |
| `frontend/src/pages/users/Users.css` | Vendor badge + org chart styles |
| `frontend/src/pages/fieldops/vendor-logs/VendorWorkLogForm.jsx` | 2-line fix |
| `frontend/src/App.jsx` | 1 new route |
