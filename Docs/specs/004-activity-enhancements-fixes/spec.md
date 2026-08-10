# Feature Specification: Activity Enhancements & Fixes

**Feature Branch**: `004-activity-enhancements-fixes`

**Created**: 2026-05-13

**Status**: Draft

**Input**: Six areas: (1) Team selection showing IDs not names + SiteClient in employee list,
(2) Device selection from project stock with conflict filtering + Asset Type+Device picker,
(3) Email notification when users added to activity, (4) My Activities cross-project view,
(5) Device installation workflow auto-move to Assets bugs, (6) General fixes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Team selection shows names + SiteClient hidden (Priority: P1 — Bug Fix)

**1a:** PM opens ActivityForm → clicks lead engineer select → sees full names (e.g. "John Smith (L1Engineer)"), not raw IDs.

**1b:** Admin opens UsersList → Employees tab shows no SiteClient users (they only appear if a "Client" tab/filter is added, or they are simply excluded from the Employees tab).

**Why P1**: UX-breaking bug — the form is unusable when IDs display instead of names.

**Independent Test**: Open ActivityForm for a project → leadEngineer select shows "John Smith (Supervisor)" → assignees multi-select shows names → save → detail page shows names.

**Acceptance Scenarios**:
1. **Given** ActivityForm loads, **When** user clicks "Lead Engineer", **Then** a select dropdown shows all active non-vendor users with `fullName (role)` format.
2. **Given** ActivityForm in edit mode, **When** it loads an existing activity, **Then** the leadEngineer and assignees fields are pre-populated with the correct user names.
3. **Given** UsersList Employees tab, **When** it renders, **Then** users with role=SiteClient do not appear in the Employees list.

---

### User Story 2 — Device selection from project stock (Priority: P2)

PM opens ActivityForm → "Required Devices" section shows a dropdown of allocated stock items for the project (from `ProjectStockAllocation`) instead of free-form text. Each entry shows "Asset Type — Device Type (Remaining: N)". Devices already assigned to other activities for this project are greyed out or excluded.

**Why P2**: Prevents double-booking devices and ties activity planning to actual inventory.

**Independent Test**: Project has 3 allocated stock items → open ActivityForm → device dropdown shows 3 items with remaining counts → select item 1 → save → open another ActivityForm for same project → item 1 is marked as already assigned.

**Acceptance Scenarios**:
1. **Given** project has allocated stock, **When** PM clicks "Add Device" in ActivityForm, **Then** a select shows items from `GET /stock/allocations?projectId=...` with asset type, device type, and remaining qty.
2. **Given** a device is assigned to Activity A, **When** PM opens ActivityForm for Activity B (same project), **Then** that device is marked "(Assigned)" and excluded from selection (or shown disabled).
3. **Given** remainingQty of a stock item is 0, **When** it appears in the dropdown, **Then** it is shown as "(Out of Stock)" and disabled.

---

### User Story 3 — Email notification on activity assignment (Priority: P2)

When a PM creates or updates an activity and adds users as leadEngineer or assignees, each newly-added user receives an email with: project name, activity title, type, planned dates, task list summary, and a link.

**Why P2**: Communication gap — assigned engineers currently don't know they've been assigned.

**Independent Test**: Create activity with 2 assignees → both users receive email with activity title, project name, and task count.

**Acceptance Scenarios**:
1. **Given** activity is created with lead=UserA and assignees=[UserB], **When** saved, **Then** UserA and UserB each receive an email within 10 seconds (async).
2. **Given** activity is updated and UserC is added to assignees, **When** saved, **Then** UserC (only the newly added user) receives an email.
3. **Given** email SMTP fails, **When** activity is saved, **Then** the activity saves successfully (email failure is non-blocking).

---

### User Story 4 — My Activities cross-project view (Priority: P2)

Engineers/PMs open a new "My Activities" page from the sidebar or FieldOps navigation. It shows all activities across all projects where they are the leadEngineer or an assignee, grouped by project, with status, priority, planned dates, and task progress.

**Why P2**: Without this, engineers must manually check each project to find their work.

**Independent Test**: User A is assignee in 2 activities across 2 projects → open My Activities → both appear.

**Acceptance Scenarios**:
1. **Given** user is assigned to activities in 3 projects, **When** they open My Activities, **Then** all 3 projects' activities appear, grouped by project.
2. **Given** user has no assigned activities, **When** they open My Activities, **Then** an empty state "No activities assigned to you" appears.
3. **Given** My Activities is accessed by Admin, **When** they view it, **Then** they see activities they're assigned to (same filter as others).

---

### User Story 5 — Device installation workflow auto-asset conversion (Priority: P3)

When an engineer updates a device status to 'Deployed', the system automatically creates an Asset record in the ticketing system linked to the device's site. The device shows as "Converted to Asset" and the asset is immediately monitored for maintenance.

**Why P3**: Important for lifecycle tracking but not blocking daily operations.

**Independent Test**: Update device status to Deployed → response includes `convertedToAsset: true` → Asset record exists with correct deviceType, serial, site assignment.

**Acceptance Scenarios**:
1. **Given** a device with site linked, **When** status → 'Deployed', **Then** `Asset.create` is called, `device.convertedToAsset = true`, and `device.convertedAssetId` is set.
2. **Given** `device.convertedToAsset` is already true, **When** status updated again, **Then** no duplicate Asset is created.
3. **Given** project has no linkedSiteId, **When** status → 'Deployed', **Then** the system gracefully skips Asset creation and logs a warning; the device status still updates.

---

### Edge Cases

- ActivityForm: User is only in leadEngineer dropdown if `isActive: true` AND `role !== 'Vendor'`
- Device assignment tracking: Uses `Activity.requiredDevices[].allocationId` — if null, device is untracked (legacy)
- Email notifications are fire-and-forget (Promise without await in the controller to prevent blocking)
- My Activities does not appear in the main sidebar by default — accessed via FieldOps section or dedicated link
- Asset auto-conversion: Only happens on first 'Deployed' transition; `convertedToAsset` guard prevents duplicates

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `ActivityForm.jsx` MUST replace the leadEngineer text input with a `<select>` populated from `usersApi.getAll({ isActive: true, limit: 500 })`, filtered to non-Vendor roles.
- **FR-002**: `ActivityForm.jsx` MUST replace the assignees text input with a multi-select or checkbox list showing `fullName (role)` for each user.
- **FR-003**: `UsersList.jsx` Employees filter MUST exclude both `Vendor` AND `SiteClient` roles.
- **FR-004**: `ActivityForm.jsx` "Required Devices" section MUST load allocated stock via `stockApi.getAllocations({ projectId, limit: 200 })` and show a dropdown with asset type, device type, and remaining qty.
- **FR-005**: `Activity.requiredDevices` schema MUST support optional `allocationId` to track specific stock assignments.
- **FR-006**: The device dropdown MUST mark items as disabled when (a) already assigned to another activity in the same project, or (b) remainingQty = 0.
- **FR-007**: `email.utils.js` MUST add `sendActivityAssignmentEmail(activity, project, users)` function.
- **FR-008**: `projectActivity.controller.js` `createProjectActivity` MUST call the email function (non-blocking) after saving.
- **FR-009**: `projectActivity.controller.js` `updateProjectActivity` MUST call the email function for newly added users only.
- **FR-010**: Backend MUST add `GET /api/fieldops/activities/my-activities` endpoint returning activities across all projects where the authenticated user is leadEngineer or assignee.
- **FR-011**: Frontend MUST add `MyActivities.jsx` page at route `/fieldops/my-activities`.
- **FR-012**: `updateDeviceStatus` in `fieldops.controller.js` MUST correctly populate `device.projectId.linkedSiteId` before the asset conversion check.
- **FR-013**: `updateDeviceStatus` MUST populate `device.allocationId` to access `stockItemId` for the stock status update.

### Key Entities

- **Activity.requiredDevices** — add optional `allocationId: ObjectId` ref to `ProjectStockAllocation`
- **MyActivities page** — groups `Activity[]` by `projectId` for the current user
- **sendActivityAssignmentEmail** — new email function in email.utils.js

## Success Criteria *(mandatory)*

- **SC-001**: ActivityForm shows fullName dropdowns for both leadEngineer and assignees.
- **SC-002**: SiteClient users absent from UsersList Employees tab.
- **SC-003**: Device dropdown in ActivityForm shows project's allocated stock, not free-form text.
- **SC-004**: Activity creation sends email to leadEngineer + all assignees.
- **SC-005**: My Activities page loads activities across all projects for the current user.
- **SC-006**: Status update to 'Deployed' creates Asset record without 500 error.
- **SC-007**: ESLint passes with zero new errors on all new/modified frontend files.

## Assumptions

- `usersApi.getAll` with `limit: 500` is acceptable for the users dropdown (typical orgs < 500 users).
- The `stockApi.getAllocations` endpoint already exists and returns populated stock items.
- Email is fire-and-forget — activity saves even if email fails.
- `My Activities` does not require Admin visibility of all users' activities — each user sees only their own.
- The device "already assigned" check queries other activities for the same project (not cross-project).
- `Activity.model.js` `requiredDevices[].allocationId` is an optional new field — existing records with `null` are unaffected.
