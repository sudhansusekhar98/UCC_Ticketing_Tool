# Implementation Plan: FieldOps Project Activities

**Branch**: `002-fieldops-project-activities` | **Date**: 2026-05-13 | **Spec**: `specs/002-fieldops-project-activities/spec.md`

**Input**: Feature specification from `specs/002-fieldops-project-activities/spec.md`

## Summary

Add a full Activity management system to the FieldOps portal. PM/Admins create Activities
(project planning units covering vendor work, device requirements, and sub-tasks with deadlines)
under each project. When submitting a daily work log, the PM selects activities worked on today,
marks sub-tasks complete, and provides delay reasons for any overdue incomplete tasks. The backend
model + CRUD API already exist — this feature fills three gaps: (1) two backend model patches,
(2) all frontend pages, and (3) integration of activity selection into the daily log form.

## Technical Context

**Language/Version**: JavaScript — Node.js/Express backend, React 19/Vite frontend

**Primary Dependencies**:
- Backend: Mongoose (already), `Activity.model.js` (already), `projectActivity.controller.js` (already)
- Frontend: React Router 7 (already), `fieldOpsApi` axios service (already), lucide-react, date-fns

**Storage**: MongoDB Atlas via Mongoose — patch `PMDailyLog` model, patch `Activity.activityTaskSchema`

**Testing**: ESLint (`npm run lint`) + manual browser validation per `quickstart.md`

**Target Platform**: Web (same stack as existing fieldops portal)

**Project Type**: Web application — React SPA + Express REST API

**Performance Goals**: Activity prefill query < 1s (indexed on `projectId`, `status`, `isActive`)

**Constraints**:
- Zero new npm packages
- Backend activity CRUD is already implemented — do NOT rewrite it
- The `createPMDailyLog` / `updatePMDailyLog` handlers in `fieldops.controller.js` must be
  located and updated (they handle both create and update in the same file)
- `PMDailyLog` has a unique compound index `(projectId, submittedBy, logDate)` — no changes needed

**Scale/Scope**: 3 new frontend pages, 4 new API methods surface, 2 backend model patches,
4 new routes in App.jsx

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Layered Architecture | PASS | Routes → Controller → Model; new pages → fieldOpsApi service |
| II. RBAC | PASS | All new routes: allowedRoles=['Admin','Supervisor'], requiredRight=PROJECT_MANAGEMENT_PORTAL; controller uses isPMorAdmin / canAccessProject helpers already implemented |
| III. Real-Time | PASS | useState + useEffect pattern matches existing fieldops pages; no Socket.IO changes needed |
| IV. Security | PASS | No sensitive fields; audit middleware already applies to POST/PUT/DELETE on fieldops routes |
| V. Observability | PASS | Index added for activityEntries.activityId query; no new background jobs |

## Project Structure

### Documentation (this feature)

```text
specs/002-fieldops-project-activities/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Architecture decisions
├── data-model.md        # Backend schema changes + frontend state shapes
├── quickstart.md        # Validation steps
└── contracts/
    ├── api.md           # API contracts (existing + new)
    └── routes.md        # Frontend route contracts + file locations
```

### Source Code

```text
backend-express/
├── models/
│   ├── Activity.model.js              (modified — add plannedEnd to activityTaskSchema)
│   └── PMDailyLog.model.js            (modified — add activityEntries subdoc + index)
└── controllers/
    └── fieldops.controller.js         (modified — handle activityEntries in create/update log)

frontend/src/
├── App.jsx                            (modified — 4 new routes + 3 imports)
├── services/api.js                    (modified — 10 new methods in fieldOpsApi)
├── pages/fieldops/
│   ├── ProjectDetail.jsx              (modified — add Activities card to section nav)
│   ├── pm-logs/
│   │   └── PMDailyLogForm.jsx         (modified — add Activities Worked Today section)
│   │   └── PMDailyLogView.jsx         (modified — show activityEntries in view)
│   ├── sections/
│   │   └── ProjectActivitiesSection.jsx  (new)
│   └── activities/
│       ├── ActivityForm.jsx           (new — create/edit, task template chips)
│       └── ActivityDetail.jsx         (new — detail view, inline task toggle)
```

**Structure Decision**: Web application option. Backend patches are surgical (2 model files +
1 controller). Frontend follows the `sections/` pattern from feature 001 for the list page,
and a new `activities/` subdirectory for form and detail pages.

## Implementation Notes

### Backend Patch 1: `Activity.model.js`

Add `plannedEnd: { type: Date }` to `activityTaskSchema` (line ~29, after the `notes` field).
No migration needed — existing tasks will have `plannedEnd: undefined`.

### Backend Patch 2: `PMDailyLog.model.js`

Before `pmDailyLogSchema`, add:

```js
const taskWorkEntrySchema = new mongoose.Schema({
  taskId:      { type: mongoose.Schema.Types.ObjectId, required: true },
  taskTitle:   { type: String, maxlength: 200 },
  completed:   { type: Boolean, default: false },
  delayReason: { type: String, maxlength: 500 }
}, { _id: true, timestamps: false });

const activityEntrySchema = new mongoose.Schema({
  activityId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
  activityTitle: { type: String, maxlength: 200 },
  tasksWorked:   [taskWorkEntrySchema],
  progressNote:  { type: String, maxlength: 500 }
}, { _id: true, timestamps: false });
```

Add to `pmDailyLogSchema` (before the closing `}`):
```js
activityEntries: [activityEntrySchema]
```

Add index after existing indexes:
```js
pmDailyLogSchema.index({ 'activityEntries.activityId': 1 });
```

### Backend Patch 3: `fieldops.controller.js`

Locate `createPMDailyLog`. In the destructuring of `req.body`, add `activityEntries`.
Pass to `PMDailyLog.create(...)`: `activityEntries: activityEntries || []`.

Locate `updatePMDailyLog`. Add:
```js
if (req.body.activityEntries !== undefined) {
  log.activityEntries = req.body.activityEntries;
}
```

### Frontend: `api.js`

Add 10 methods inside the `fieldOpsApi` object (see `contracts/api.md` for exact method signatures).

### Frontend: `ProjectDetail.jsx`

Import `Activity` from lucide-react. Add one `<SectionCard>` to the section nav grid:
```jsx
<SectionCard
  to={`/fieldops/projects/${id}/activities`}
  icon={<Activity size={22} />}
  label="Activities"
/>
```

### Frontend: `ProjectActivitiesSection.jsx`

- Uses `ProjectSectionLayout` for project header
- Local state: `activities`, `loading`, `filters` (status, type)
- On mount: `fieldOpsApi.getProjectActivities(id)` → set activities
- Filter UI: two `<select>` dropdowns (status, type) inline
- Activity card layout: activity number chip + title + status dropdown + type badge +
  priority dot + lead engineer + progress bar (progress%) + planned dates + task count badge
- Status `<select>` calls `updateActivityStatus(activityId, newStatus)` on change
- "New Activity" button → navigate to `/fieldops/projects/${id}/activities/new`
- Click card body → navigate to `/fieldops/activities/${activity._id}`

### Frontend: `ActivityForm.jsx`

- Reads `projectId` from URL params (create) or `activityId` (edit via separate route)
- Sections: Basic Info, Team, Timeline, Sub-Tasks, Required Resources
- Task template chips: on `type` change call `getActivityTaskSuggestions(type)` →
  render chip buttons; clicking a chip adds that title as a new task row
- Each task row: text input for title + date input for plannedEnd + delete button
- "Add Task" button for manual task entry
- Save: POST (create) or PUT (edit) → on success navigate to activity detail

### Frontend: `ActivityDetail.jsx`

- Reads `activityId` from URL params
- Fetches: `fieldOpsApi.getActivityById(activityId)` on mount
- Header: back link to activities list, activityNumber, title, status select (quick change),
  edit button (→ edit route), delete button (confirm dialog → soft delete → navigate back)
- Progress bar based on `progressPercentage`
- Sub-task list: each row has checkbox (calls `updateActivityTask`), title, deadline chip
  (red if overdue, green if done on-time, gray if no deadline), notes (shown if present)
- Add task inline: text input + add button at bottom of task list
- Required Devices/Stock: read-only pills
- Timeline: plannedStart → plannedEnd, actualStart → actualEnd

### Frontend: `PMDailyLogForm.jsx` — activity entry section

Add state variables at top:
```js
const [openActivities, setOpenActivities] = useState([]);
const [activityEntries, setActivityEntries] = useState([]);
```

In `loadData()`, after fetching project details:
```js
const prefillRes = await fieldOpsApi.getDailyLogPrefill(projectId);
setOpenActivities(prefillRes.data.data || []);
```

Add "Activities Worked Today" section below the existing task checklist. For each open activity:
- Checkbox to include/exclude the activity in today's log
- When included: show sub-task list with checkboxes
- Each task row: checkbox (completed), task title, deadline chip (red if overdue)
- If overdue + unchecked: show a textarea "Delay reason (required)" below the task
- Helper function `isOverdue(task, logDate)`: `task.plannedEnd && task.plannedEnd < logDate`

Before submit, validate:
```js
const hasOverdueWithoutReason = activityEntries.some(entry =>
  entry.tasksWorked.some(t => t.isOverdue && !t.completed && !t.delayReason.trim())
);
if (hasOverdueWithoutReason) {
  toast.error('Please provide delay reasons for all overdue tasks');
  return;
}
```

Include `activityEntries` (strip `isOverdue` derived field before sending) in the API call body.

### Frontend: `PMDailyLogView.jsx` — activity entries display

Add a read-only "Activities" section at the bottom (above photos), shown if `log.activityEntries?.length > 0`:
- Each activity entry: activity number + title + tasks with completed/incomplete indicator +
  delay reasons shown in amber text below the task if present.

## Complexity Tracking

> No constitution violations. Three new pages are required because each serves a distinct user
> story and combining them would reduce clarity and independent testability.
