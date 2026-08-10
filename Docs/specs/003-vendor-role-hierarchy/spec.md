# Feature Specification: Vendor Role, Org Chart Hierarchy, Vendor Log Fix

**Feature Branch**: `003-vendor-role-hierarchy`

**Created**: 2026-05-13

**Status**: Draft

**Input**: (1) Add a Vendor role to the Users section with proper tagging; employees selected by
default in UI. (2) A canvas to define employee hierarchy. (3) Fix VendorWorkLogForm to show only
vendors, not all employees.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Add and manage a Vendor user (Priority: P1)

An Admin opens Users → Add User → selects role "Vendor" → fills name, email, mobile.
The created user appears in the list with a distinct amber "Vendor" badge. In the UsersList,
the default view shows only employees (non-Vendor); a toggle or tab reveals vendors.
When the Admin opens Create Vendor Work Log, the vendor dropdown shows ONLY users with
role=Vendor.

**Why this priority**: The vendor filter bug is already broken in production. Adding the Vendor
role is the prerequisite fix for all downstream vendor-related features.

**Independent Test**: Create a user with role=Vendor → UsersList shows them with "Vendor" badge →
open VendorWorkLogForm → vendor dropdown shows only the newly created vendor (not all employees).

**Acceptance Scenarios**:

1. **Given** Admin opens Add User, **When** they select Role = Vendor, **Then** the Site Access
   field becomes optional (Vendors are external; no site assignment required).
2. **Given** a Vendor user exists, **When** Admin opens UsersList without any filter, **Then**
   only employee roles (Admin, Supervisor, Dispatcher, L1Engineer, L2Engineer, ClientViewer,
   SiteClient) appear by default; Vendors are hidden unless "Show Vendors" is toggled ON.
3. **Given** a Vendor user exists, **When** PM opens "Add Vendor Work Log", **Then** the Vendor
   dropdown lists only users with `role === 'Vendor'`, not all active users.

---

### User Story 2 — View and edit employee reporting hierarchy (Priority: P2)

An Admin opens Users → "Org Chart" → sees a top-down SVG tree of all active non-vendor
employees arranged by their `reportsTo` relationship. Employees without a manager float at the
top. Admin clicks a user node → sees an "Edit" option → opens UserForm where they can set the
`Reports To` field to select a manager. The org chart updates after save.

**Why this priority**: Hierarchy is a planning/visibility feature; vendor fix (US1) is more
urgent. Hierarchy does not block any other workflow.

**Independent Test**: Set user A's reportsTo = user B → open OrgChart → user A appears as a
child node beneath user B with a connecting SVG line.

**Acceptance Scenarios**:

1. **Given** 5 employees with reportsTo set, **When** Admin opens the Org Chart page, **Then**
   nodes are arranged in a tree: root nodes at top, children below, connected by SVG lines.
2. **Given** the UserForm for an employee, **When** Admin selects "Reports To" from a dropdown,
   **Then** the dropdown shows all active non-vendor employees except the current user (to
   prevent self-reference); saving updates the org chart.
3. **Given** an employee has no reportsTo set, **Then** they appear as a root node in the
   org chart.

---

### User Story 3 — Vendor dropdown in Vendor Work Log shows only vendors (Priority: P1)

This is the immediate bug fix: `VendorWorkLogForm` currently shows all users except
SiteClient/ClientViewer when selecting a vendor. It must filter to `role === 'Vendor'` only.

**Why this priority**: Equal to US1 — this is the visible user-facing bug.

**Independent Test**: With at least one Vendor user and 3 non-vendor users: open
Add Vendor Work Log → Vendor select shows exactly the Vendor user(s), nobody else.

**Acceptance Scenarios**:

1. **Given** the system has 10 employees + 2 vendors, **When** PM opens Vendor Work Log form,
   **Then** the vendor dropdown shows exactly 2 entries (the 2 vendor users).
2. **Given** zero vendor users exist, **When** PM opens Vendor Work Log form, **Then** the
   vendor dropdown shows only the placeholder "-- Select Vendor --" with an info hint
   "No vendors yet. Ask Admin to add vendors."

---

### Edge Cases

- Vendor user assigned no sites: site validation MUST be skipped for role=Vendor.
- Self-reference in reportsTo: UserForm MUST exclude the current user from the reportsTo dropdown.
- Circular hierarchy (A→B→A): Org chart renders a flat list for circular nodes rather than
  crashing; validation in UserForm prevents setting reportsTo to a user who already reports to you.
- Org chart with 0 employees: shows empty state "No employees found."
- Vendor in reportsTo dropdown: Vendors MUST NOT appear in the reportsTo dropdown (they are
  external, not part of the internal hierarchy).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `User.model.js` MUST add `'Vendor'` to the role enum (after SiteClient).
- **FR-002**: `lookup.controller.js` `getRoles()` MUST add `{ value: 'Vendor', label: 'Vendor' }`.
- **FR-003**: `Notification.model.js` `targetRoles` enum MUST add `'Vendor'` to prevent
  validation errors if notifications are sent to vendors.
- **FR-004**: `UserForm.jsx` site validation MUST skip for role=Vendor (in addition to Admin).
- **FR-005**: `UsersList.jsx` MUST default to showing only non-Vendor users; a "Show Vendors"
  toggle (or tab) allows viewing vendors separately.
- **FR-006**: `UsersList.jsx` getRoleBadgeClass MUST include `'Vendor'` → amber badge class.
- **FR-007**: `VendorWorkLogForm.jsx` MUST filter the vendor list to `role === 'Vendor'` only,
  replacing the current exclusion filter.
- **FR-008**: `User.model.js` MUST add `reportsTo: { type: ObjectId, ref: 'User' }` field.
- **FR-009**: `UserForm.jsx` MUST add a "Reports To" select field (shows all active non-vendor
  users except self; optional field; blank = no manager).
- **FR-010**: A new `OrgChart.jsx` page MUST be created at route `/users/org-chart` showing
  a pure SVG/React tree of employee hierarchy.
- **FR-011**: `App.jsx` MUST register the `/users/org-chart` route (Admin/Supervisor only).
- **FR-012**: `UsersList.jsx` MUST add an "Org Chart" button linking to `/users/org-chart`.

### Key Entities

- **User** (modified): adds `role: 'Vendor'` to enum + `reportsTo: ObjectId` field.
- **OrgNode** (frontend-only): derived tree structure — `{ user, children: OrgNode[] }` built
  from the flat users list using `reportsTo` references.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Creating a user with role=Vendor succeeds without site assignment.
- **SC-002**: VendorWorkLogForm shows 0 non-vendor users in the vendor dropdown.
- **SC-003**: OrgChart page loads and renders a connected tree for any project with 3+ employees
  having reportsTo set.
- **SC-004**: ESLint passes with zero new errors on all modified/new files.
- **SC-005**: The Vendor badge in UsersList is visually distinct from all other role badges.

## Assumptions

- Vendor users CAN log in to the system (they have credentials) — they are external contractors
  tracked in the system for fieldops vendor log linkage.
- The org chart is view-only on initial load; Admin edits hierarchy through the existing
  UserForm's new "Reports To" field.
- No new npm packages — org chart uses pure React + SVG.
- `SiteClient` role remains in the enum (not changed by this feature).
- The `usersApi.getAll` endpoint already supports `role` param filtering — verified from code.
- Vendors appear in a separate section/tab in UsersList, NOT mixed with employees, to keep the
  default employee list clean.
