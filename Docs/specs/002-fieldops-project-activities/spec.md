# Feature Specification: FieldOps Project Activities

**Feature Branch**: `002-fieldops-project-activities`

**Created**: 2026-05-13

**Status**: Draft

**Input**: PM or Admins create activities for a project covering project planning/execution.
Activities include vendor-related work decisions, device assignments, and sub-tasks with deadlines.
When PM submits a daily work log they select activities worked on, mark tasks complete, and must
provide a delay reason for any overdue task that is still incomplete.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Create and manage a project activity (Priority: P1)

A PM or Admin opens a project and creates an "Activity" that defines a discrete piece of work:
civil/vendor trenching, technical device installation, or maintenance. They set the activity type,
assign a lead engineer + team, attach required device types and stock items, add sub-tasks each
with an optional planned-end date, and set an overall planned start/end window. The activity
appears in the project's Activities section with a status of **ToDo**.

**Why this priority**: Activities are the foundation — daily log linking depends on them existing.

**Independent Test**: From the project hub, click the Activities section card → click "New Activity"
→ fill title + type + lead engineer + 3 tasks → save → activity appears in the list with status
**ToDo** and the correct task count.

**Acceptance Scenarios**:

1. **Given** an Admin is on a project's Activities page, **When** they create an activity with
   title, type=Construction, lead engineer, and 2 tasks with planned end dates, **Then** the
   activity is saved with `activityNumber` auto-generated (format `ACT-YYYYMMDD-XXXX`), status
   = `ToDo`, and both tasks are listed.
2. **Given** an activity exists, **When** the PM edits it to change status to `InProgress`,
   **Then** `actualStart` is set automatically and the list reflects the new status.
3. **Given** a user is not the PM, Admin, Supervisor, lead engineer, or assignee, **When** they
   try to edit the activity, **Then** a 403 Forbidden error is returned.

---

### User Story 2 — Link activities to a daily work log (Priority: P2)

When submitting a PM Daily Log, the PM sees a section "Activities Worked Today" that loads all
open activities for the project. The PM selects one or more activities, then for each selected
activity they see its sub-task list with checkboxes. They mark completed tasks. If any sub-task
has a `plannedEnd` date ≤ today's log date and is still **not** checked complete, the system
requires a **delay reason** before the log can be saved.

**Why this priority**: This is the core daily capture workflow — the primary reason activities exist.

**Independent Test**: Open an active project with at least one InProgress activity that has 2
tasks (one overdue). Open the daily log form → "Activities Worked Today" section appears → select
the activity → uncheck the overdue task → attempt to save → form shows validation error requiring
delay reason for the overdue task → add reason → save succeeds.

**Acceptance Scenarios**:

1. **Given** the daily log form loads, **When** the PM expands the Activities section, **Then**
   all project activities with status in [ToDo, InProgress, Review, Blocked] are listed with
   their sub-tasks.
2. **Given** a task's `plannedEnd` < today and it is not marked complete, **When** the PM saves
   the log without a delay reason, **Then** the form shows an inline validation error: "Delay
   reason required for overdue task: [task title]".
3. **Given** all required delay reasons are provided, **When** the PM submits, **Then** the log
   is saved with an `activityEntries` array containing the selected activities, task completions,
   and delay reasons.

---

### User Story 3 — View all activities for a project (Priority: P3)

The Activities section page shows all activities for a project in a list/kanban view. The PM can
filter by status and type, see progress percentages, and change status via a quick dropdown.

**Why this priority**: Visibility into activity pipeline; depends on US1 for data.

**Independent Test**: With 3 activities in different statuses, open the Activities section page →
all 3 are visible → filter by status=InProgress → only InProgress activities show.

**Acceptance Scenarios**:

1. **Given** a project has activities, **When** the Activities section page loads, **Then**
   activities are grouped or listed with their status badge, type badge, progress %, planned dates,
   and lead engineer name.
2. **Given** the PM clicks an activity's status badge, **When** they select a new status,
   **Then** the status updates via `PATCH /activities/:id/status` and the list reflects the change.

---

### User Story 4 — View activity detail (Priority: P4)

Clicking an activity opens a dedicated detail page showing full task list with completion state,
linked daily log entries, team members, required devices/stock, and planned vs actual timeline.

**Why this priority**: Audit and progress tracking; depends on US1 and US2.

**Independent Test**: Click an activity with 2 linked daily log entries → detail page shows both
linked log dates, task completion percentages per log, and the current overall progress %.

**Acceptance Scenarios**:

1. **Given** an activity detail page is open, **When** the PM checks off a task inline,
   **Then** `PATCH /activities/:id/tasks/:taskId` is called and the task shows as done with
   a green check and the completer's name.
2. **Given** the activity has linked daily log entries (from US2), **When** the detail page
   loads, **Then** the linked log dates are shown under "Daily Log History".

---

### Edge Cases

- What if a project has no open activities when submitting a daily log? → The "Activities Worked
  Today" section shows an info message "No open activities — create activities first" with a link.
- What if an activity is marked Done while a daily log references it? → Log still saves; done
  activities do not appear in future log prefill.
- What if the PM tries to uncheck a task that was completed in a locked log? → Task state in
  the activity itself can still be toggled (they are separate concerns).
- Activity `requiredDevices` references device types — not individual allocated devices. Actual
  device-to-activity linking uses `DeviceInstallation.activityId`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow PM, Admin, or Supervisor to create activities under a project.
- **FR-002**: Activity MUST support types: Technical, Construction, Maintenance.
- **FR-003**: Activity MUST support sub-tasks, each with optional `plannedEnd` date.
- **FR-004**: `PMDailyLog.model.js` MUST be extended with `activityEntries` array storing
  per-activity task completion records and delay reasons.
- **FR-005**: Daily log form MUST load open activities via
  `GET /api/fieldops/projects/:projectId/daily-log/prefill` and allow PM to select activities.
- **FR-006**: For any sub-task where `plannedEnd ≤ logDate` AND `completed = false`, a
  `delayReason` string MUST be provided before the log saves.
- **FR-007**: System MUST add API methods for activities to `frontend/src/services/api.js`.
- **FR-008**: A new "Activities" section card MUST be added to the ProjectDetail hub grid.
- **FR-009**: Three new frontend routes MUST be registered:
  `/fieldops/projects/:id/activities` (list), `/fieldops/projects/:id/activities/new` (create),
  `/fieldops/activities/:activityId` (detail).
- **FR-010**: Activity form MUST show task template chips per activity type (from
  `GET /api/fieldops/activities/task-suggestions?type=...`).

### Key Entities

- **Activity**: projectId, activityNumber, title, description, type, status, priority,
  leadEngineer, assignees, requiredDevices, requiredStockItems, tasks[], plannedStart, plannedEnd,
  progressPercentage, metrics, createdBy — **already implemented in backend**.
- **ActivityTask** (subdoc): title, order, done, doneBy, doneAt, notes, plannedEnd (new field).
- **ActivityEntry** (new PMDailyLog subdoc): activityId, tasksWorked[], progressNote.
- **TaskEntry** (subdoc of ActivityEntry): taskId, title (snapshot), completed, delayReason.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: PM can create an activity with tasks and see it listed in < 3 seconds.
- **SC-002**: Daily log form loads open activities in < 1 second (indexed query).
- **SC-003**: Submitting a daily log with a selected activity that has an overdue incomplete task
  without a delay reason is blocked with a clear validation message.
- **SC-004**: After submitting a log with activity entries, the linked entries appear in the
  activity detail page.
- **SC-005**: ESLint passes with no new errors on all new/modified frontend files.

## Assumptions

- The Activity model's `requiredDevices` field references `DeviceType` (a catalog type), not
  individual allocated stock items — device-to-activity assignment uses `DeviceInstallation.activityId`.
- Activity `plannedEnd` on sub-tasks requires a schema change (new `plannedEnd` field on
  `activityTaskSchema`).
- The existing `taskChecklist` on PMDailyLog is for free-form tasks not linked to activities;
  both can coexist.
- Backend activity CRUD routes and controller are already fully implemented — backend work is
  limited to: (1) adding `plannedEnd` to `activityTaskSchema`, (2) adding `activityEntries` to
  `PMDailyLog`, (3) updating create/update log handlers to persist `activityEntries`.
- No new user roles needed — existing PM/Admin/Supervisor RBAC applies.
