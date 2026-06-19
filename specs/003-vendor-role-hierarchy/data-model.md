# Data Model: Vendor Role, Org Chart, Vendor Log Fix

## Backend model changes

### 1. `User.model.js` — two additions

```js
// Change role enum from:
enum: ['Dispatcher', 'L1Engineer', 'L2Engineer', 'Supervisor', 'Admin', 'ClientViewer', 'SiteClient']
// To:
enum: ['Dispatcher', 'L1Engineer', 'L2Engineer', 'Supervisor', 'Admin', 'ClientViewer', 'SiteClient', 'Vendor']

// Add to userSchema body (after profilePicture field):
reportsTo: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  default: null
}
```

Add index (after existing indexes):
```js
userSchema.index({ reportsTo: 1 });
```

Export constant addition:
```js
export const UserRoles = {
  ...existing,
  VENDOR: 'Vendor'
};
```

### 2. `Notification.model.js` — enum extension

```js
// Change targetRoles enum from:
enum: ['Dispatcher', 'L1Engineer', 'L2Engineer', 'Supervisor', 'Admin', 'ClientViewer']
// To:
enum: ['Dispatcher', 'L1Engineer', 'L2Engineer', 'Supervisor', 'Admin', 'ClientViewer', 'SiteClient', 'Vendor']
```

### 3. `lookup.controller.js` — add Vendor to getRoles()

```js
function getRoles() {
  return [
    { value: 'Admin',        label: 'Administrator' },
    { value: 'Supervisor',   label: 'Supervisor' },
    { value: 'Dispatcher',   label: 'Dispatcher' },
    { value: 'L1Engineer',   label: 'L1 Engineer' },
    { value: 'L2Engineer',   label: 'L2 Engineer' },
    { value: 'ClientViewer', label: 'Client Viewer' },
    { value: 'Vendor',       label: 'Vendor' },       // ← new
  ];
}
```

---

## Frontend data structures

### OrgNode (frontend-only, built in OrgChart.jsx)

```ts
interface OrgNode {
  user: User                // raw user object from API
  children: OrgNode[]       // direct reports
  x: number                 // computed layout x (px, center of node)
  y: number                 // computed layout y (px, top of node)
  subtreeWidth: number      // computed total width for layout
}
```

### Layout constants (OrgChart.jsx)

```ts
const NODE_WIDTH  = 160   // px width of each node card
const NODE_HEIGHT = 72    // px height of each node card
const H_GAP       = 24    // horizontal gap between sibling subtrees
const V_GAP       = 64    // vertical gap between levels (space for SVG lines)
const ROW_HEIGHT  = NODE_HEIGHT + V_GAP
```

### User object shape (from API, relevant fields)

```ts
{
  _id: string
  fullName: string
  role: 'Admin' | 'Supervisor' | 'Dispatcher' | 'L1Engineer' | 'L2Engineer'
      | 'ClientViewer' | 'SiteClient' | 'Vendor'
  designation?: string
  reportsTo?: string | null     // ObjectId of manager user
  isActive: boolean
  profilePicture?: string
}
```

---

## API changes

### `usersApi.getAll` — no signature change; new usage

VendorWorkLogForm will call: `usersApi.getAll({ role: 'Vendor', isActive: true, limit: 200 })`

OrgChart will call: `usersApi.getAll({ isActive: true, limit: 500 })`
(fetches all; splits vendors client-side for display logic)

### User create/update — new field accepted

The users controller accepts `req.body` spread. Adding `reportsTo` to the payload from
UserForm will be stored automatically if the model field exists. No controller change needed.

### UserForm `reportsTo` dropdown source

```
GET /api/users?isActive=true&limit=500
→ filter client-side: role !== 'Vendor' && _id !== currentUserId
→ sort by fullName
```
