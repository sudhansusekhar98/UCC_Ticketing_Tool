# Implementation Plan: Vendor Role, Org Chart & Vendor Log Fix

**Branch**: `003-vendor-role-hierarchy` | **Date**: 2026-05-13 | **Spec**: `specs/003-vendor-role-hierarchy/spec.md`

## Summary

Three interconnected changes: (1) Add `Vendor` as a new user role — backend enum + lookup +
frontend badge + site validation fix. (2) Add `reportsTo` to User model and build a pure
SVG/React org chart page at `/users/org-chart`. (3) Fix `VendorWorkLogForm` to filter vendors
by `role === 'Vendor'` instead of the broken exclusion list. No new npm packages. No new API
endpoints.

## Technical Context

**Language/Version**: JavaScript — Node.js/Express backend, React 19/Vite frontend

**Primary Dependencies**: Existing — Mongoose, React Router 7, lucide-react, existing CSS classes

**Storage**: MongoDB — 2 model patches (User, Notification), 1 lookup update

**Testing**: ESLint + manual browser validation per quickstart.md

**Target Platform**: Web (same stack)

**Project Type**: Web application

**Performance Goals**: OrgChart renders 200 nodes in < 1s (pure DOM, no canvas)

**Constraints**:
- Zero new npm packages — org chart is pure React + SVG
- No new API endpoints
- `usersApi.getAll` already supports `role` param filtering

**Scale/Scope**: 3 backend file patches, 1 new frontend page, 4 modified frontend files,
1 new route in App.jsx

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Layered Architecture | PASS | No business logic in routes; new page uses api.js service |
| II. RBAC | PASS | `/users/org-chart` route: allowedRoles=['Admin','Supervisor']; Vendor users naturally excluded from all authorize() guards |
| III. Real-Time | PASS | No Socket.IO changes; no React Query changes |
| IV. Security | PASS | No sensitive field changes; existing audit middleware covers user CRUD |
| V. Observability | PASS | Index added for reportsTo; no new background jobs |

## Project Structure

### Documentation (this feature)

```text
specs/003-vendor-role-hierarchy/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Architecture decisions
├── data-model.md        # Schema changes + frontend data shapes
├── quickstart.md        # Validation steps
└── contracts/
    └── routes.md        # Route + file contracts
```

### Source Code

```text
backend-express/
├── models/
│   ├── User.model.js              (modified — Vendor enum + reportsTo + index)
│   └── Notification.model.js      (modified — add Vendor to targetRoles enum)
└── controllers/
    └── lookup.controller.js       (modified — add Vendor to getRoles())

frontend/src/
├── App.jsx                        (modified — 1 new route + 1 import)
└── pages/users/
    ├── OrgChart.jsx               (new — SVG tree org chart)
    ├── UserForm.jsx               (modified — reportsTo field + site validation fix)
    ├── UsersList.jsx              (modified — Employees/Vendors toggle + Org Chart button + badge)
    ├── Users.css                  (modified — role-vendor badge + org chart styles)
    └── (fieldops neighbor):
        ../fieldops/vendor-logs/
            VendorWorkLogForm.jsx  (modified — 2-line vendor filter fix)
```

## Implementation Notes

### Backend: User.model.js

Add `'Vendor'` to role enum (append after `'SiteClient'`). Add `reportsTo` field:
```js
reportsTo: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  default: null
}
```
Add `userSchema.index({ reportsTo: 1 })` after existing indexes.
Add `VENDOR: 'Vendor'` to `UserRoles` constants.

### Backend: Notification.model.js

Change `targetRoles` enum to include both `'SiteClient'` (was missing) and `'Vendor'`:
```js
enum: ['Dispatcher', 'L1Engineer', 'L2Engineer', 'Supervisor', 'Admin', 'ClientViewer', 'SiteClient', 'Vendor']
```

### Backend: lookup.controller.js

Append `{ value: 'Vendor', label: 'Vendor' }` to the array returned by `getRoles()`.

### Frontend: VendorWorkLogForm.jsx (2-line fix, do this first)

Change the `Promise.all` result handler:
```js
// OLD (line 68–69):
const allUsers = usersRes.data.data || [];
setVendors(allUsers.filter(u => !['SiteClient', 'ClientViewer'].includes(u.role)));

// NEW: fetch vendors directly:
```
Change the `usersApi.getAll` call to fetch only vendors:
```js
usersApi.getAll({ role: 'Vendor', limit: 200, isActive: true })
```
Set `setVendors(usersRes.data.data || [])` without further filtering.
Add empty-state hint below the select when `vendors.length === 0`:
```jsx
{vendors.length === 0 && (
  <span className="form-hint">No vendors yet. Ask Admin to add vendor users.</span>
)}
```

### Frontend: UserForm.jsx

**reportsTo field** — add state `allUsers` (loaded alongside other dropdowns):
```js
const [allUsers, setAllUsers] = useState([]);
```
In `loadDropdowns`, add:
```js
const usersRes = await usersApi.getAll({ isActive: true, limit: 500 });
setAllUsers(usersRes.data.data || []);
```
In `formData`, add `reportsTo: ''`.
In `loadUser`, set `reportsTo: user.reportsTo?._id || user.reportsTo || ''`.
In `payload`, add `reportsTo: formData.reportsTo || null`.

Add the "Reports To" select group after the "Designation" field:
```jsx
<div className="form-group">
  <label className="form-label">Reports To</label>
  <select className="form-select" value={formData.reportsTo}
    onChange={e => handleChange('reportsTo', e.target.value)}>
    <option value="">-- No Manager (Root) --</option>
    {allUsers
      .filter(u => u.role !== 'Vendor' && (u._id || u.userId) !== id)
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map(u => (
        <option key={u._id || u.userId} value={u._id || u.userId}>
          {u.fullName} ({u.role})
        </option>
      ))
    }
  </select>
  <span className="form-hint">Select the manager this user reports to</span>
</div>
```

**Site validation fix** — change the validation guard:
```js
// OLD:
if (formData.role !== 'Admin' && (!formData.assignedSites || formData.assignedSites.length === 0))
// NEW:
if (!['Admin', 'Vendor'].includes(formData.role) && (!formData.assignedSites || formData.assignedSites.length === 0))
```

Add Vendor to the Role Descriptions section at the bottom of the form.

### Frontend: UsersList.jsx

**Employees/Vendors toggle** — add `showVendors` boolean state (default false). Split the
fetched `userData` into `employees` and `vendors`. Render a toggle row above the table:
```jsx
<div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
  <button className={`btn btn-sm ${!showVendors ? 'btn-primary' : 'btn-ghost'}`}
    onClick={() => setShowVendors(false)}>Employees</button>
  <button className={`btn btn-sm ${showVendors ? 'btn-primary' : 'btn-ghost'}`}
    onClick={() => setShowVendors(true)}>Vendors</button>
</div>
```
`displayedUsers` = `showVendors ? vendors : employees` (after filters).
Total count label updates accordingly.

**Org Chart button** — add next to "Add User" button:
```jsx
<Link to="/users/org-chart" className="btn btn-ghost">
  <GitBranch size={18} /> Org Chart
</Link>
```
Import `GitBranch` from lucide-react.

**Badge fix** — add to `getRoleBadgeClass`:
```js
case 'Vendor': return 'role-vendor';
```

### Frontend: Users.css

Add:
```css
.role-vendor {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.3);
}
```
Add org chart styles for `.org-chart-container`, `.org-node`, `.org-node-name`,
`.org-node-role`, `.org-node-avatar`.

### Frontend: OrgChart.jsx (new page)

```
Import: useState, useEffect, Link, usersApi, toast, GitBranch, ArrowLeft, Users.css

State:
  users: []    — all active non-vendor users
  loading: boolean

On mount: usersApi.getAll({ isActive: true, limit: 500 }) → split employees vs vendors
          → use only employees for org chart

Tree building:
  1. Build map: userId → user
  2. Build children map: managerId → [userId, ...]
  3. Root nodes: users where !reportsTo or reportsTo not in userMap

Layout (recursive):
  function layoutNode(userId, depth, xOffset):
    children = childrenMap[userId] || []
    if no children: subtreeWidth = NODE_WIDTH
    else: layout each child; subtreeWidth = sum(child.subtreeWidths) + (n-1)*H_GAP
    x = xOffset + subtreeWidth/2
    y = depth * ROW_HEIGHT
    return { userId, x, y, subtreeWidth, children: [...] }

  Run layout on each root node, advancing xOffset by each root's subtreeWidth + H_GAP

Render:
  <div className="page-container">
    <div className="page-header">
      <Link to="/users"><ArrowLeft/> Back to Users</Link>
      <h1>Organisation Chart</h1>
    </div>
    <div className="glass-card org-chart-container" style={{ position:'relative', minHeight: canvasHeight, overflow:'auto' }}>
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
        {/* lines from parent bottom-center to child top-center */}
        {edges.map(({x1,y1,x2,y2}, i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="var(--border-light,rgba(148,163,184,0.35))" strokeWidth={1.5} />
        ))}
      </svg>
      {flatNodes.map(node => (
        <Link key={node.userId} to={`/users/${node.userId}/edit`}
          className="org-node" style={{ left: node.x - NODE_WIDTH/2, top: node.y }}>
          <div className="org-node-avatar">{user.fullName[0].toUpperCase()}</div>
          <div className="org-node-name">{user.fullName}</div>
          <div className={`role-badge ${getRoleBadgeClass(user.role)}`}>{user.role}</div>
        </Link>
      ))}
    </div>
  </div>
```

Empty state: if no employees → "No employees found."
Users without reportsTo → root nodes at top.

### Frontend: App.jsx

Add import: `import OrgChart from './pages/users/OrgChart';`
Add route (after `/users/new` route):
```jsx
<Route path="/users/org-chart"
  element={<ProtectedRoute allowedRoles={['Admin', 'Supervisor']}>
    <OrgChart />
  </ProtectedRoute>} />
```

## Complexity Tracking

> No constitution violations.

| Decision | Justification |
|----------|--------------|
| No new npm packages | Pure SVG org chart sufficient; keeps bundle size stable |
| Client-side split for Employees/Vendors | Users list is small; avoids backend filter param addition |
