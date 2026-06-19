# Research: Vendor Role, Org Chart, Vendor Log Fix

## Decision: Add 'Vendor' as a new role in the User model enum

**Decision**: Extend the `role` enum in `User.model.js` with `'Vendor'` (after `'SiteClient'`).
Update `lookup.controller.js` `getRoles()` and `Notification.model.js` enum to match.

**Rationale**: Role-based filtering is the cleanest way to distinguish vendor contacts from
employees. Using a separate collection would require major data migration and API changes.
Adding a role is a 3-file surgical change.

**Impact audit** (files referencing the role enum):
- `backend-express/models/User.model.js` — enum definition ← modify
- `backend-express/models/Notification.model.js` — `targetRoles` enum ← add Vendor
- `backend-express/controllers/lookup.controller.js` — `getRoles()` hardcoded list ← add Vendor
- `frontend/src/pages/users/UserForm.jsx` — role select (populated from API, no enum hardcode)
  and site validation logic ← fix validation
- `frontend/src/pages/users/UsersList.jsx` — badge class + filter ← update
- `frontend/src/pages/fieldops/vendor-logs/VendorWorkLogForm.jsx` — vendor filter ← fix

No authorize() middleware changes needed — Vendor users will naturally have no access to
protected routes since they won't be in any `authorize('Admin', 'Supervisor', ...)` call lists.

---

## Decision: Separate vendor view in UsersList — tab toggle, not a second page

**Decision**: Add a `showVendors` boolean state to `UsersList`. When false (default), pass
`role: notVendor` OR use client-side split. Since the API supports `role` param, the cleanest
approach is to fetch employees and vendors separately using the role filter param:
- Default: `usersApi.getAll({ role: 'notVendor' })` — but the API likely doesn't support
  "not equals" filtering.

**Alternative chosen**: Fetch all users and split client-side into employees vs. vendors.
Render a toggle button "Employees" / "Vendors" that switches the displayed list.
The page size is typically small enough that client-side split is fine.

**Rationale**: Simpler than adding a new `notVendor` filter param to the backend. The users
list rarely exceeds a few hundred records.

---

## Decision: `reportsTo` field on User model for hierarchy

**Decision**: Add `reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }` as an
optional field to `userSchema`. No required constraint.

**Rationale**: Simple self-referential FK — the standard approach for org hierarchies in MongoDB.
No new collections or complex aggregations. The org chart builds the tree on the frontend from
the flat list.

**Circular reference prevention**: Frontend UserForm excludes the current user from the reportsTo
dropdown. Backend does not validate cycles (rare edge case — defer to future enhancement).

---

## Decision: Pure SVG/React org chart — no new npm packages

**Decision**: `OrgChart.jsx` renders the hierarchy using pure SVG lines + React div nodes.
Layout algorithm: recursive top-down breadth-first with dynamic width calculation.

**Algorithm**:
1. Build tree from flat users list: `reportsTo` → children map.
2. Root nodes = users where `reportsTo` is null/undefined + orphans (reportsTo points to
   a non-existent or inactive user).
3. Layout: recursive function assigns `x` (center of subtree) and `y` (depth × rowHeight).
   Subtree width = max(nodeWidth, sum of children subtree widths + gap).
4. Render: `<div>` nodes positioned with CSS `position: absolute; left: x; top: y`.
   SVG `<line>` elements drawn from parent center-bottom to child center-top.
5. Container: `position: relative; overflow: auto` with a scroll wrapper.

**Node design**: 40px avatar circle (initial letter) + name + role badge (amber for Vendor,
matching UsersList). Clicking a node navigates to `/users/:id/edit`.

**Rationale**: Avoids adding react-d3-tree, react-organizational-chart, or any other package.
SVG lines are sufficient for the use case. Pure CSS absolute positioning is performant for
up to ~200 nodes.

---

## Decision: VendorWorkLogForm filter by inclusion, not exclusion

**Decision**: Change line 69 in `VendorWorkLogForm.jsx`:
```js
// BEFORE:
setVendors(allUsers.filter(u => !['SiteClient', 'ClientViewer'].includes(u.role)));
// AFTER:
setVendors(allUsers.filter(u => u.role === 'Vendor'));
```

**Rationale**: Inclusion filter is more future-proof — adding new non-vendor roles won't
accidentally leak them into the vendor list.

---

## Decision: `usersApi.getAll` already supports role filtering

From `api.js`: `getAll: (params) => api.get('/users', { params })`.
The backend users controller accepts `role` as a query param.
So `usersApi.getAll({ role: 'Vendor', isActive: true })` would work for the VendorWorkLogForm
instead of fetching all and filtering client-side.

**Decision**: Use `usersApi.getAll({ role: 'Vendor', isActive: true, limit: 200 })` directly in
VendorWorkLogForm to avoid fetching unnecessary records.
