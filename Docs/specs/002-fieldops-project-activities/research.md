# Research: FieldOps Project Activities

## Decision: Backend activity CRUD is already implemented — scope is frontend + two model patches

**Decision**: Do NOT re-implement the Activity model or controller. All CRUD endpoints exist
and are routed. Build only what is missing.

**Rationale**: `Activity.model.js`, `projectActivity.controller.js`, and all routes in
`fieldops.routes.js` are production-ready. Duplicating would create drift.

**Gap inventory** (from reading actual source files):
- `activityTaskSchema` is missing a `plannedEnd: Date` field for per-task deadline tracking.
- `PMDailyLog.model.js` has no `activityEntries` subdocument — the virtual on Activity
  references `foreignField: 'activityEntries.activityId'` which would fail without this field.
- `createPMDailyLog` / `updatePMDailyLog` in `fieldops.controller.js` do not yet handle
  `activityEntries` from the request body.
- Frontend `api.js` has zero activity-related API methods.
- No frontend pages for activities exist.

---

## Decision: `activityEntries` subdoc structure in `PMDailyLog`

**Decision**:
```js
// activityEntrySchema (new, embedded in PMDailyLog)
{
  activityId: ObjectId (ref: Activity, required),
  tasksWorked: [{
    taskId: ObjectId (required),
    taskTitle: String (snapshot, maxlength 200),
    completed: Boolean (default false),
    delayReason: String (maxlength 500)  // required when overdue+not completed
  }],
  progressNote: String (maxlength 500)
}
```

**Rationale**: Embedding rather than referencing keeps the daily log self-contained for audit
purposes. `taskTitle` is a snapshot so the display is stable even if the activity task is
renamed later.

**Alternatives considered**:
- Separate `DailyLogActivityEntry` collection — adds join overhead, unnecessary for this scope.

---

## Decision: Delay reason validation is frontend-only (form-level)

**Decision**: The frontend form validates that `delayReason` is non-empty when a task is
overdue + incomplete. Backend accepts `activityEntries` as-is without re-validating delay reason.

**Rationale**: The backend doesn't know the PM's intended log date at validation time without
extra complexity. Frontend already has the log date and task plannedEnd — it can validate locally.
This matches the pattern used for GPS capture (optional, client-determined).

**If stronger enforcement needed later**: Add a Mongoose validator on `activityEntries.tasksWorked`
that cross-references `Activity.tasks[n].plannedEnd` — defer until flagged.

---

## Decision: Activity list page uses a flat list with status filter (not kanban)

**Decision**: `ProjectActivitiesSection.jsx` renders a filterable list view. The backend supports
`?groupByStatus=true` for kanban but the kanban UI adds significant scope.

**Rationale**: Kanban drag-drop is a separate feature; a list view with status badges and quick
status-change dropdowns delivers the core value. Can be upgraded to kanban later.

---

## Decision: Activity form loads task template chips via API

**Decision**: On activity type change, call
`GET /api/fieldops/activities/task-suggestions?type={type}` and render chips the PM can
click to add as tasks. Already implemented in backend.

**Rationale**: Reduces PM effort — most Technical activities share the same 7 tasks.

---

## Decision: `api.js` activity methods use `fieldOpsApi` namespace

**Decision**: Add activity methods inside the existing `fieldOpsApi` object in
`frontend/src/services/api.js` to keep them co-located with other fieldops calls.

**Rationale**: Consistent pattern. No new service file needed.

---

## Decision: Daily log prefill uses existing route, no new backend endpoint

**Decision**: `GET /api/fieldops/projects/:projectId/daily-log/prefill` already returns
open activities. `PMDailyLogForm` calls this on mount.

**Rationale**: Route + controller already exist and tested.
