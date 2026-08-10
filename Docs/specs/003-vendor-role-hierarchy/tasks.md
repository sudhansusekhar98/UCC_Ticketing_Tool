---
description: "Task list for Vendor Role, Org Chart & Vendor Log Fix"
---

# Tasks: Vendor Role, Org Chart & Vendor Log Fix

**Input**: Design documents from `specs/003-vendor-role-hierarchy/`

**Prerequisites**: plan.md âœ… spec.md âœ… research.md âœ… data-model.md âœ… contracts/ âœ…

**Tests**: Not requested â€” no test tasks generated.

**Organization**: US1 (Vendor role UI) + US3 (vendor filter fix) are both P1 and share the same
backend foundation; they are implemented together. US2 (org chart) is P2 and independent.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Maps to spec.md user story
- Exact file paths in every task

---

## Phase 1: Setup

**Purpose**: No directories to create â€” all files are in existing locations.

- [X] T001 Verify `frontend/src/pages/users/` directory exists (no action needed if present â€” confirm OrgChart.jsx target path)

**Checkpoint**: Ready to implement â€” no blocking setup

---

## Phase 2: Foundational â€” Backend model + lookup patches

**Purpose**: Add Vendor to the data layer. All three tasks are in different files and can run in parallel.
US1, US3, and US2 all depend on the Vendor role existing in the backend.

- [X] T002 [P] Patch `backend-express/models/User.model.js`:
  - In the `role` enum array, append `'Vendor'` after `'SiteClient'`:
    change `enum: ['Dispatcher','L1Engineer','L2Engineer','Supervisor','Admin','ClientViewer','SiteClient']`
    to `enum: ['Dispatcher','L1Engineer','L2Engineer','Supervisor','Admin','ClientViewer','SiteClient','Vendor']`
  - Add `reportsTo` field to `userSchema` body (after the `cloudinaryId` field):
    `reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }`
  - Add index after existing indexes: `userSchema.index({ reportsTo: 1 });`
  - Add `VENDOR: 'Vendor'` to the `UserRoles` constants export object

- [X] T003 [P] Patch `backend-express/models/Notification.model.js`:
  - Find the `targetRoles` field's `enum` array
  - Change it to include both `'SiteClient'` (was missing) and `'Vendor'`:
    `enum: ['Dispatcher','L1Engineer','L2Engineer','Supervisor','Admin','ClientViewer','SiteClient','Vendor']`

- [X] T004 [P] Patch `backend-express/controllers/lookup.controller.js` `getRoles()` function:
  - Add `{ value: 'Vendor', label: 'Vendor' }` as the last entry in the returned array
  - The full array should be: Admin, Supervisor, Dispatcher, L1Engineer, L2Engineer, ClientViewer, Vendor

**Checkpoint**: Backend accepts Vendor role + reportsTo field â€” frontend changes can now be implemented

---

## Phase 3: User Story 1 + 3 â€” Vendor Role in UI & Vendor Filter Fix (Priority: P1) ðŸŽ¯ MVP

**Goal**: US1 â€” Vendor users tagged with amber badge; UsersList defaults to employees view; UserForm
accepts Vendor with optional sites. US3 â€” VendorWorkLogForm shows only Vendor-role users.

**Independent Test (US1)**: Create user with role=Vendor â†’ appears in "Vendors" tab of UsersList
with amber "Vendor" badge â†’ employee list unchanged.
**Independent Test (US3)**: Open Add Vendor Work Log â†’ vendor dropdown shows only Vendor-role users.

### Implementation for User Story 1 â€” Vendor role UI

- [X] T005 [P] [US1] Update `frontend/src/pages/users/Users.css` â€” add vendor badge + org chart styles:
  - Add `.role-vendor` class: `background: rgba(245,158,11,0.15); color: #d97706; border: 1px solid rgba(245,158,11,0.3);`
    (matches existing `.role-*` class pattern in the file â€” append after the last role class)
  - Add org chart node styles (for OrgChart.jsx, task T009 below):
    ```css
    .org-chart-container { position: relative; min-height: 500px; overflow: auto; padding: 2rem; }
    .org-node {
      position: absolute; width: 160px;
      background: var(--bg-secondary,rgba(148,163,184,0.08));
      border: 1px solid var(--border-light,rgba(148,163,184,0.18));
      border-radius: 10px; padding: 0.625rem 0.75rem;
      display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
      text-decoration: none; color: var(--text-primary);
      transition: border-color 0.12s, background 0.12s;
    }
    .org-node:hover { border-color: var(--primary-400,#60a5fa); background: rgba(59,130,246,0.06); }
    .org-node-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: var(--primary-500,#3b82f6); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 1rem; flex-shrink: 0;
    }
    .org-node-name { font-size: 0.8rem; font-weight: 600; text-align: center; line-height: 1.3; }
    .org-node-role { font-size: 0.65rem; }
    ```

- [X] T006 [P] [US1] Update `frontend/src/pages/users/UsersList.jsx`:
  - Add `import { GitBranch } from 'lucide-react';` to the existing lucide-react import block
  - Add state at the top of the component: `const [showVendors, setShowVendors] = useState(false);`
  - In `fetchUsers` result handler, split `userData` after mapping:
    ```js
    const employees = mappedUsers.filter(u => u.role !== 'Vendor');
    const vendorList = mappedUsers.filter(u => u.role === 'Vendor');
    setUsers({ employees, vendors: vendorList });
    ```
    Change `setUsers([])` and `setUsers(mappedUsers)` references accordingly â€” keep `users` as
    `{ employees: [], vendors: [] }` shape; update `setTotalCount` to use the displayed group length.
  - Change `displayedUsers` to:
    ```js
    const baseList = showVendors ? users.vendors : users.employees;
    const displayedUsers = baseList; // role + status filters already applied server-side
    ```
  - Add toggle buttons above the filter-bar (inside page-header actions, before "Add User" button):
    ```jsx
    <div style={{ display:'flex', gap:'0.375rem', marginRight:'0.5rem' }}>
      <button className={`btn btn-sm ${!showVendors ? 'btn-primary' : 'btn-ghost'}`}
        onClick={() => setShowVendors(false)}>Employees</button>
      <button className={`btn btn-sm ${showVendors ? 'btn-primary' : 'btn-ghost'}`}
        onClick={() => setShowVendors(true)}>Vendors</button>
    </div>
    ```
  - Add Org Chart link button in the header actions (after the toggle, before "Add User"):
    ```jsx
    <Link to="/users/org-chart" className="btn btn-ghost">
      <GitBranch size={16} /> Org Chart
    </Link>
    ```
  - Update `getRoleBadgeClass` to add: `case 'Vendor': return 'role-vendor';`
  - Update `users` initial state from `[]` to `{ employees: [], vendors: [] }`

- [X] T007 [P] [US1] Update `frontend/src/pages/users/UserForm.jsx` â€” reportsTo field + Vendor fix:
  - Add `const [allUsers, setAllUsers] = useState([]);` to state declarations
  - In `loadDropdowns`, add a third API call in `Promise.all`:
    ```js
    const [sitesRes, rolesRes, usersRes] = await Promise.all([
      sitesApi.getDropdown(),
      lookupsApi.getRoles(),
      usersApi.getAll({ isActive: true, limit: 500 })
    ]);
    setAllUsers(usersRes.data.data || []);
    ```
  - Add `reportsTo: ''` to `formData` initial state
  - In `loadUser`, add: `reportsTo: user.reportsTo?._id || user.reportsTo || ''`
  - In `payload` object (inside `formAction`), add: `reportsTo: formData.reportsTo || null`
  - Add "Reports To" select group in the form grid after the "Designation" field:
    ```jsx
    <div className="form-group">
      <label className="form-label">Reports To</label>
      <select className="form-select" value={formData.reportsTo}
        onChange={e => handleChange('reportsTo', e.target.value)}>
        <option value="">-- No Manager (Root node) --</option>
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
      <span className="form-hint">The manager this employee reports to (leave blank for root)</span>
    </div>
    ```
  - Fix site validation: change `formData.role !== 'Admin'` to `!['Admin','Vendor'].includes(formData.role)` in `validateForm`
  - Add Vendor description to the `.role-descriptions` section at bottom of form:
    ```jsx
    <div className="role-desc">
      <strong>Vendor:</strong> External contractor â€” used in vendor work logs; limited system access
    </div>
    ```

### Implementation for User Story 3 â€” Vendor filter fix

- [X] T008 [P] [US3] Fix `frontend/src/pages/fieldops/vendor-logs/VendorWorkLogForm.jsx`:
  - In `loadData()`, change the `Promise.all` second entry from:
    `usersApi.getAll({ limit: 200, isActive: true })`
    to:
    `usersApi.getAll({ role: 'Vendor', limit: 200, isActive: true })`
  - Remove the client-side filter (delete lines):
    `const allUsers = usersRes.data.data || [];`
    `setVendors(allUsers.filter(u => !['SiteClient','ClientViewer'].includes(u.role)));`
    Replace with: `setVendors(usersRes.data.data || []);`
  - In the vendor `<select>` JSX, add an empty-vendor hint below the select:
    ```jsx
    {vendors.length === 0 && (
      <span className="form-hint" style={{ color:'var(--warning-500,#f59e0b)' }}>
        No vendors found. Ask Admin to create users with the Vendor role.
      </span>
    )}
    ```

**Checkpoint**: US1 + US3 complete â€” Vendor users visible in UsersList with correct badge;
UserForm accepts Vendor with optional sites; VendorWorkLogForm shows only Vendor users.

---

## Phase 4: User Story 2 â€” Employee Org Chart Canvas (Priority: P2)

**Goal**: Visual SVG/React tree at `/users/org-chart` showing employee reporting hierarchy.
Admin can click any node to open the user edit page and set `reportsTo`.

**Independent Test**: Set reportsTo for 3 users forming Aâ†’Bâ†’C chain â†’ open `/users/org-chart`
â†’ A at top, B below with SVG line, C below B with SVG line.

### Implementation for User Story 2

- [X] T009 [US2] Create `frontend/src/pages/users/OrgChart.jsx` â€” full SVG tree implementation:

  **Imports**: useState, useEffect, Link from react-router-dom, ArrowLeft + Users + GitBranch from
  lucide-react, usersApi from services/api, toast from react-hot-toast, './Users.css'

  **Constants**:
  ```js
  const NODE_W = 160, NODE_H = 72, H_GAP = 32, V_GAP = 60, ROW_H = NODE_H + V_GAP;
  ```

  **getRoleBadgeClass** â€” copy the same function from UsersList.jsx (or import if refactored):
  ```js
  const roleBadge = { Admin:'role-admin', Supervisor:'role-supervisor', Dispatcher:'role-dispatcher',
    L1Engineer:'role-l1', L2Engineer:'role-l2', ClientViewer:'role-client', Vendor:'role-vendor' };
  ```

  **State**: `users` (array), `loading` (bool)

  **loadUsers**: `usersApi.getAll({ isActive: true, limit: 500 })` â†’ filter out Vendor role â†’
  `setUsers(res.data.data.filter(u => u.role !== 'Vendor'))`

  **buildTree function** (pure, called in useMemo):
  ```js
  function buildTree(users) {
    const byId = Object.fromEntries(users.map(u => [u._id || u.userId, u]));
    const childrenOf = {};
    users.forEach(u => {
      const pid = u.reportsTo?._id || u.reportsTo;
      if (pid && byId[pid]) {
        childrenOf[pid] = childrenOf[pid] || [];
        childrenOf[pid].push(u._id || u.userId);
      }
    });
    const roots = users.filter(u => {
      const pid = u.reportsTo?._id || u.reportsTo;
      return !pid || !byId[pid];
    });
    return { byId, childrenOf, rootIds: roots.map(u => u._id || u.userId) };
  }
  ```

  **layoutNode function** (recursive, returns { nodes[], edges[] } + subtreeWidth):
  ```js
  function layoutNode(id, depth, xOffset, byId, childrenOf, nodes, edges) {
    const children = childrenOf[id] || [];
    let subtreeWidth = 0;
    let childX = xOffset;
    children.forEach(cid => {
      const cw = layoutNode(cid, depth + 1, childX, byId, childrenOf, nodes, edges);
      edges.push({
        x1: xOffset + subtreeWidth + cw/2, y1: depth * ROW_H + NODE_H,
        x2: childX + cw/2, y2: (depth+1) * ROW_H
      });
      // fix: recompute after children are placed
      childX += cw + H_GAP;
      subtreeWidth += cw + H_GAP;
    });
    if (subtreeWidth > 0) subtreeWidth -= H_GAP; // remove trailing gap
    subtreeWidth = Math.max(subtreeWidth, NODE_W);
    const cx = xOffset + subtreeWidth / 2;
    nodes.push({ id, x: cx - NODE_W/2, y: depth * ROW_H, user: byId[id] });
    return subtreeWidth;
  }
  ```

  **Layout computation** (useMemo on users):
  ```js
  const { flatNodes, edges, canvasW, canvasH } = useMemo(() => {
    if (!users.length) return { flatNodes:[], edges:[], canvasW:800, canvasH:400 };
    const { byId, childrenOf, rootIds } = buildTree(users);
    const nodes = [], edges = [];
    let xOffset = 0;
    rootIds.forEach(rid => {
      const sw = layoutNode(rid, 0, xOffset, byId, childrenOf, nodes, edges);
      xOffset += sw + H_GAP;
    });
    // Recalculate edges: layoutNode above needs a second pass for correct parent x
    // Simpler: use the node list to draw edges from parent node center
    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
    const correctEdges = [];
    nodes.forEach(n => {
      const pid = n.user?.reportsTo?._id || n.user?.reportsTo;
      if (pid && nodeMap[pid]) {
        const p = nodeMap[pid];
        correctEdges.push({
          x1: p.x + NODE_W/2, y1: p.y + NODE_H,
          x2: n.x + NODE_W/2, y2: n.y
        });
      }
    });
    const maxX = Math.max(...nodes.map(n => n.x + NODE_W), 800);
    const maxY = Math.max(...nodes.map(n => n.y + NODE_H), 400);
    return { flatNodes: nodes, edges: correctEdges, canvasW: maxX + 40, canvasH: maxY + 40 };
  }, [users]);
  ```

  **Render**:
  ```jsx
  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div className="header-left">
          <Link to="/users" className="btn btn-ghost"><ArrowLeft size={18}/></Link>
          <div>
            <h1 className="page-title">Organisation Chart</h1>
            <p className="page-subtitle">{users.length} employees</p>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="loading-state"><div className="spinner"/><p>Loadingâ€¦</p></div>
      ) : users.length === 0 ? (
        <div className="glass-card empty-state">
          <Users size={40}/><h3>No employees found</h3>
          <p>Set Reports To on user profiles to build the hierarchy.</p>
        </div>
      ) : (
        <div className="glass-card org-chart-container" style={{ width: canvasW, minWidth:'100%', height: canvasH }}>
          <svg style={{ position:'absolute', inset:0, width: canvasW, height: canvasH, pointerEvents:'none' }}>
            {edges.map((e,i) => (
              <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                stroke="rgba(148,163,184,0.4)" strokeWidth={1.5} strokeDasharray="4 3"/>
            ))}
          </svg>
          {flatNodes.map(n => (
            <Link key={n.id} to={`/users/${n.id}/edit`} className="org-node"
              style={{ left: n.x, top: n.y }}>
              <div className="org-node-avatar">
                {n.user?.profilePicture
                  ? <img src={n.user.profilePicture} alt={n.user.fullName} style={{width:36,height:36,borderRadius:'50%',objectFit:'cover'}}/>
                  : n.user?.fullName?.[0]?.toUpperCase()
                }
              </div>
              <div className="org-node-name">{n.user?.fullName}</div>
              <span className={`role-badge org-node-role ${roleBadge[n.user?.role]||''}`}>
                {n.user?.role}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
  ```

- [X] T010 [US2] Add OrgChart route to `frontend/src/App.jsx`
  (depends on T009):
  - Add import after existing user page imports:
    `import OrgChart from './pages/users/OrgChart';`
  - Add route after the `/users/new` route:
    ```jsx
    <Route path="/users/org-chart"
      element={
        <ProtectedRoute allowedRoles={['Admin', 'Supervisor']}>
          <OrgChart />
        </ProtectedRoute>
      }
    />
    ```

**Checkpoint**: Org chart page loads, renders SVG tree, clicking nodes navigates to user edit

---

## Phase N: Polish & Cross-Cutting Concerns

- [X] T011 [P] Run `cd frontend && npm run lint` â€” fix any errors in modified files:
  `UsersList.jsx`, `UserForm.jsx`, `VendorWorkLogForm.jsx`, `OrgChart.jsx`, `App.jsx`
- [X] T012 Manual browser validation per `specs/003-vendor-role-hierarchy/quickstart.md`:
  - Create user with role=Vendor (no sites required) âœ“
  - UsersList Employees tab shows no Vendors; Vendors tab shows Vendor badge âœ“
  - VendorWorkLogForm vendor dropdown shows only Vendor users âœ“
  - UserForm reportsTo dropdown shows non-vendor employees only âœ“
  - Org Chart renders SVG tree for users with reportsTo set âœ“
  - Org Chart node click â†’ navigates to user edit âœ“

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: T001 â€” immediate, trivial check
- **Phase 2 (Foundational)**: T002 + T003 + T004 â€” all parallel, must complete before frontend tests
- **Phase 3 (US1+US3)**: T005 + T006 + T007 + T008 â€” all parallel (different files)
- **Phase 4 (US2)**: T009 â†’ T010 (sequential â€” import must exist)
- **Polish**: T011 + T012 â€” after all above

### User Story Dependencies

- **US1 (P1)**: Requires T002+T004 (Vendor in model + lookup)
- **US3 (P1)**: Requires T002 (Vendor role must exist in DB)
- **US2 (P2)**: Requires T002 (reportsTo field in model); independent of US1/US3 otherwise

### Parallel Opportunities

```
T001              (trivial check)
T002 || T003 || T004    (foundational backend â€” all parallel)
T005 || T006 || T007 || T008   (frontend files â€” all parallel after T002â€“T004)
T009 â†’ T010       (org chart â€” sequential)
T011 || T012-prep  (polish)
```

---

## Implementation Strategy

### MVP First (US1 + US3 only â€” vendor role fix)

1. T002 + T003 + T004 (backend patches â€” ~5 min)
2. T005 + T006 + T007 + T008 (frontend changes â€” parallel)
3. **Validate**: Create Vendor user â†’ UsersList shows amber badge â†’ VendorWorkLogForm shows only vendor
4. Stop â€” US2 (org chart) is a separate increment

### Full Delivery

Continue with T009 â†’ T010 â†’ T011 â†’ T012

---

## Notes

- [P] tasks = different files, safe to implement concurrently
- `UsersList.jsx` state change from `users: []` to `users: { employees: [], vendors: [] }` requires
  careful update of all `users.length` and `displayedUsers` references
- `OrgChart.jsx` layout uses a two-pass approach: first compute positions, then draw edges from
  the nodeMap (more reliable than computing edge coords during recursion)
- Vendor users are excluded from the org chart tree (they're external contractors)
- The `reportsTo` dropdown in `UserForm.jsx` filters out `id` (the current user being edited)
  using `useParams()` â€” `id` is already available in the component

